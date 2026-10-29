-- LabelLens Phase 1 schema: roles, scans, images, extracted fields, edit history, append-only audit log,
-- row-level security (RLS), private image bucket, and realtime publication. Run in the Supabase SQL editor.

-- ENUM TYPES -------------------------------------------------------------------------------------------
-- The three user roles (no admin role; inspector holds rule governance later) and the scan lifecycle.
create type user_role as enum ('customer', 'manufacturer', 'inspector');
create type scan_status as enum ('uploaded', 'processing', 'needs_review', 'reviewed', 'completed', 'failed');
create type panel_type as enum ('front', 'ingredients', 'nutrition', 'declaration');
create type field_status as enum ('ok', 'uncertain', 'missing');

-- PROFILES ---------------------------------------------------------------------------------------------
-- One row per auth user holding their role. Roles are NEVER self-assigned: users cannot update this table.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  display_name text,
  created_at timestamptz not null default now()
);

-- Helper: returns the calling user's role. SECURITY DEFINER so policies can read profiles without recursion.
create function current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- SCANS ------------------------------------------------------------------------------------------------
-- A scan is one package capture session. scan_type separates consumer product scans from manufacturer draft labels.
create table scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scan_type text not null default 'product' check (scan_type in ('product', 'draft_label')),
  title text,
  status scan_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scans_owner_idx on scans(owner_id, created_at desc);

-- IMAGE ASSETS -----------------------------------------------------------------------------------------
-- One row per uploaded panel photo; the file itself lives in the private storage bucket at storage_key.
create table image_assets (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  panel panel_type not null,
  storage_key text not null,
  width int, height int,
  created_at timestamptz not null default now()
);
create index image_assets_scan_idx on image_assets(scan_id);

-- EXTRACTED FIELDS -------------------------------------------------------------------------------------
-- Structured values read from images. Keeps confidence, status, and the source image so every value is traceable.
create table extracted_fields (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  key text not null,
  value text,
  unit text,
  confidence numeric check (confidence between 0 and 1),
  status field_status not null default 'uncertain',
  source_asset_id uuid references image_assets(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index extracted_fields_scan_idx on extracted_fields(scan_id);

-- FIELD EDITS ------------------------------------------------------------------------------------------
-- History of every correction (old value, new value, who, when). Written only by the trigger below.
create table field_edits (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references extracted_fields(id) on delete cascade,
  scan_id uuid not null references scans(id) on delete cascade,
  old_value text, new_value text,
  edited_by uuid references auth.users(id),
  edited_at timestamptz not null default now()
);

-- AUDIT EVENTS -----------------------------------------------------------------------------------------
-- Append-only log of important actions. Nobody gets UPDATE/DELETE rights; inserts happen via triggers/server only.
create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- TRIGGERS ---------------------------------------------------------------------------------------------
-- Keeps updated_at current on scans and fields.
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger scans_touch before update on scans for each row execute function touch_updated_at();
create trigger fields_touch before update on extracted_fields for each row execute function touch_updated_at();

-- Records an audit event whenever a scan is created.
create function audit_scan_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_events(actor_id, action, target_type, target_id, detail)
  values (new.owner_id, 'scan.created', 'scan', new.id, jsonb_build_object('scan_type', new.scan_type));
  return new;
end $$;
create trigger scans_audit after insert on scans for each row execute function audit_scan_created();

-- Records an audit event on scan status changes (e.g. uploaded -> processing).
create function audit_scan_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into audit_events(actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'scan.status_changed', 'scan', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger scans_status_audit after update on scans for each row execute function audit_scan_status();

-- When a field value is corrected: save old/new in field_edits and write an audit event.
create function audit_field_edit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.value is distinct from old.value then
    insert into field_edits(field_id, scan_id, old_value, new_value, edited_by)
    values (new.id, new.scan_id, old.value, new.value, auth.uid());
    insert into audit_events(actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'field.corrected', 'extracted_field', new.id,
            jsonb_build_object('key', new.key, 'old', old.value, 'new', new.value));
  end if;
  return new;
end $$;
create trigger fields_audit after update on extracted_fields for each row execute function audit_field_edit();

-- ROW LEVEL SECURITY -----------------------------------------------------------------------------------
alter table profiles enable row level security;
alter table scans enable row level security;
alter table image_assets enable row level security;
alter table extracted_fields enable row level security;
alter table field_edits enable row level security;
alter table audit_events enable row level security;

-- Profiles: a user can read their own profile; inspectors can read all (to show names). No write policy = no writes.
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_inspector_read on profiles for select using (current_role_name() = 'inspector');

-- Scans: owners see and create their own; inspectors see all (demo scope). Status changes go through the server only.
create policy scans_owner_read on scans for select using (owner_id = auth.uid());
create policy scans_inspector_read on scans for select using (current_role_name() = 'inspector');
-- Inserts must start at 'uploaded' so clients cannot forge a later status.
create policy scans_owner_insert on scans for insert with check (owner_id = auth.uid() and status = 'uploaded');

-- Image assets: same visibility as the parent scan; owners insert their own.
create policy assets_owner_read on image_assets for select using (owner_id = auth.uid());
create policy assets_inspector_read on image_assets for select using (current_role_name() = 'inspector');
create policy assets_owner_insert on image_assets for insert with check (owner_id = auth.uid());

-- Extracted fields: readable by the scan owner and inspectors; only the scan owner may correct values.
create policy fields_owner_read on extracted_fields for select
  using (exists (select 1 from scans s where s.id = scan_id and s.owner_id = auth.uid()));
create policy fields_inspector_read on extracted_fields for select using (current_role_name() = 'inspector');
create policy fields_owner_update on extracted_fields for update
  using (exists (select 1 from scans s where s.id = scan_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from scans s where s.id = scan_id and s.owner_id = auth.uid()));

-- Field edit history: readable by the scan owner and inspectors; never writable by clients.
create policy edits_owner_read on field_edits for select
  using (exists (select 1 from scans s where s.id = scan_id and s.owner_id = auth.uid()));
create policy edits_inspector_read on field_edits for select using (current_role_name() = 'inspector');

-- Audit log: inspectors can read; nobody can update or delete (no such policies, and privileges revoked below).
create policy audit_inspector_read on audit_events for select using (current_role_name() = 'inspector');
revoke update, delete, truncate on audit_events from anon, authenticated;
revoke insert, update, delete on field_edits, profiles from anon, authenticated;

-- Column-level guard: authenticated users may only change the value of a field, not its scan or confidence.
revoke update on extracted_fields from authenticated;
grant update (value) on extracted_fields to authenticated;

-- STORAGE ----------------------------------------------------------------------------------------------
-- Private bucket for package photos. Files are stored under "<owner uuid>/<scan uuid>/<file>".
insert into storage.buckets (id, name, public) values ('scan-images', 'scan-images', false)
on conflict (id) do nothing;

-- Owners can read/upload only inside their own folder; inspectors can read everything in the bucket.
create policy images_owner_read on storage.objects for select
  using (bucket_id = 'scan-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy images_owner_insert on storage.objects for insert
  with check (bucket_id = 'scan-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy images_inspector_read on storage.objects for select
  using (bucket_id = 'scan-images' and current_role_name() = 'inspector');

-- REALTIME ---------------------------------------------------------------------------------------------
-- Publishes these tables so dashboards update live (Realtime respects RLS, so users only receive rows they may read).
alter publication supabase_realtime add table scans, extracted_fields, image_assets;
