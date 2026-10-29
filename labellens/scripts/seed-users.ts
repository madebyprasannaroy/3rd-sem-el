// Seed script: creates the three demo accounts (customer, manufacturer, inspector) and assigns roles using the service-role key.
// Run once after applying the migration:  npm run seed   (reads keys from .env.local via your shell environment)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first");
const admin = createClient(url, key, { auth: { persistSession: false } });

// The accounts to create. Passwords come from environment variables so none are stored in code.
const users = [
  { email: "customer@labellens.test", role: "customer", password: process.env.SEED_CUSTOMER_PASSWORD },
  { email: "manufacturer@labellens.test", role: "manufacturer", password: process.env.SEED_MANUFACTURER_PASSWORD },
  { email: "inspector@labellens.test", role: "inspector", password: process.env.SEED_INSPECTOR_PASSWORD },
] as const;

// Creates each auth user (already confirmed) and upserts their profile row with the intended role.
async function main() {
  for (const u of users) {
    if (!u.password) throw new Error(`Missing password env var for ${u.role}`);
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
    if (error && !/already/i.test(error.message)) throw error;
    const id = data?.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((x) => x.email === u.email)!.id;
    const { error: pe } = await admin.from("profiles").upsert({ id, role: u.role, display_name: u.role });
    if (pe) throw pe;
    console.log(`ready: ${u.email} (${u.role})`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
