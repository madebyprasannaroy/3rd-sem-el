// POST /api/extract-direct: Accepts images as base64 in a JSON body and runs Gemini Vision extraction directly.
// This bypasses Supabase entirely — designed for demo mode when no DB is configured.
import { NextResponse } from "next/server";
import { extractWithGemini, type ImageInput } from "@/core/geminiExtractor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images, title } = body as {
      images: { panel: string; base64: string; mimeType: string }[];
      title?: string;
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    // Convert base64 payloads to ImageInput buffers
    const imageInputs: ImageInput[] = images.map((img, idx) => ({
      panelHint: img.panel || "full_pack",
      mimeType: img.mimeType || "image/jpeg",
      buffer: Buffer.from(img.base64, "base64"),
      assetId: `direct-asset-${idx}`,
    }));

    const { result, isFallback, reason } = await extractWithGemini(imageInputs, title || undefined);

    return NextResponse.json({
      ok: true,
      detected_panels: result.detected_panels,
      product_summary: result.product_summary,
      fields: result.fields,
      fields_count: result.fields.length,
      isFallback,
      reason,
    });
  } catch (err: any) {
    console.error("Direct extraction error:", err);
    return NextResponse.json(
      { error: err.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
