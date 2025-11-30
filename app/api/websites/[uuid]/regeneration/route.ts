import { NextRequest, NextResponse } from "next/server";
import { ensureClient } from "@/lib/supabase";
import sharp from "sharp";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
const STORAGE_FOLDER = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER ?? "uploads";

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const processImageUrl = async (url: string | null, supabase: any, websiteUuid: string): Promise<string | null> => {
  if (!url || !url.startsWith("http")) return url;

  // Check if already hosted on our supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && url.includes(supabaseUrl)) {
      return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    
    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let optimizedBuffer: any = buffer;
    let extension = "bin";
    let mimeType = contentType || "application/octet-stream";

    // Only optimize raster images
    if (contentType && (contentType.includes("jpeg") || contentType.includes("png") || contentType.includes("webp"))) {
        optimizedBuffer = await sharp(buffer as unknown as Buffer)
          .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        extension = "webp";
        mimeType = "image/webp";
    } else if (contentType && contentType.includes("svg")) {
        extension = "svg";
        mimeType = "image/svg+xml";
    } else if (contentType && contentType.includes("icon")) {
        extension = "ico";
        mimeType = "image/x-icon";
    } else {
        // Try to guess extension from URL
        const ext = url.split(".").pop()?.split("?")[0];
        if (ext && ext.length < 5) extension = ext;
    }

    const filename = url.split("/").pop()?.split("?")[0] || "image";
    const id = Math.random().toString(36).slice(2);
    const path = `${STORAGE_FOLDER.replace(/\/+$/u, "")}/imported-${Date.now()}-${id}.${extension}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, optimizedBuffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
        console.error("Upload error:", error);
        return url;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    
    if (data?.publicUrl) {
        // Add to media_uploads table
        await supabase.from("media_uploads").insert({
            filename: `imported-${filename}`,
            url: data.publicUrl,
            website_uuid: websiteUuid,
        });
        return data.publicUrl;
    }
    
    return url;

  } catch (error) {
    console.error("Error processing image:", url, error);
    return url;
  }
};

type RouteContext = { params: Promise<{ uuid: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { uuid } = await context.params;
  if (!uuid) {
    return NextResponse.json({ error: "Website uuid is required." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const supabase = ensureClient();

    // Process images in parallel
    const processedPayload = { ...payload };
    const imageKeys = ["logo", "banner", "banner_mobile", "image_1", "image_2", "image_3", "image_4", "favicon"];
    
    await Promise.all(imageKeys.map(async (key) => {
        if (typeof processedPayload[key] === "string") {
            processedPayload[key] = await processImageUrl(processedPayload[key] as string, supabase, uuid);
        }
    }));

    const updateFields = {
      publisher: trimOrNull(processedPayload.publisher),
      brand_full: trimOrNull(processedPayload.brand_full),
      brand_key: trimOrNull(processedPayload.brand_key),
      target_site: trimOrNull(processedPayload.target_site),
      style: trimOrNull(processedPayload.style),
      brand: trimOrNull(processedPayload.brand_full) ?? trimOrNull(processedPayload.brand),
      pretty_link: trimOrNull(processedPayload.pretty_link),
      logo: trimOrNull(processedPayload.logo),
      banner: trimOrNull(processedPayload.banner),
      banner_mobile: trimOrNull(processedPayload.banner_mobile),
      image_1: trimOrNull(processedPayload.image_1),
      image_2: trimOrNull(processedPayload.image_2),
      image_3: trimOrNull(processedPayload.image_3),
      image_4: trimOrNull(processedPayload.image_4),
      login_button_text: trimOrNull(processedPayload.login_button_text),
      register_button_text: trimOrNull(processedPayload.register_button_text),
      bonus_button_text: trimOrNull(processedPayload.bonus_button_text),
      locale: trimOrNull(processedPayload.locale),
      favicon: trimOrNull(processedPayload.favicon),
      global_code_after_head_open: trimOrNull(processedPayload.global_code_after_head_open),
      global_code_after_body_open: trimOrNull(processedPayload.global_code_after_body_open),
    };

    const { error } = await supabase.from("websites").update(updateFields).eq("uuid", uuid);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
