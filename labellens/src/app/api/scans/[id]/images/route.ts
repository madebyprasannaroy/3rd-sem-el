// POST /api/scans/:id/images: validates, cleans (strips metadata, resizes) and stores one panel photo, then records it.
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabaseServer";
import { can } from "@/core/roles";
import { validateUpload } from "@/core/uploadValidation";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(session.role, "image.upload")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const panel = String(form?.get("panel") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const check = validateUpload({ mime: file.type, size: buf.length, panel, head: buf.subarray(0, 12) });
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const sb = supabaseUser();
  // Ownership check: RLS only returns the scan if this user may see it; we additionally require them to be the owner.
  const { data: scan } = await sb.from("scans").select("id,owner_id").eq("id", params.id).single();
  if (!scan || scan.owner_id !== session.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Re-encode as JPEG: applies EXIF rotation, then drops all metadata (e.g. GPS), and limits size to 2000px.
  let out: Buffer; let width: number | undefined; let height: number | undefined;
  try {
    const img = sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 });
    const res = await img.toBuffer({ resolveWithObject: true });
    out = res.data; width = res.info.width; height = res.info.height;
  } catch { return NextResponse.json({ error: "Could not read image" }, { status: 400 }); }

  const key = `${session.userId}/${params.id}/${panel}-${Date.now()}.jpg`;
  const up = await sb.storage.from("scan-images").upload(key, out, { contentType: "image/jpeg" });
  if (up.error) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  const { data, error } = await sb.from("image_assets")
    .insert({ scan_id: params.id, owner_id: session.userId, panel, storage_key: key, width, height }).select("id").single();
  if (error) return NextResponse.json({ error: "Could not save image record" }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
