import { NextRequest, NextResponse } from "next/server";
import { ensureClient } from "@/lib/supabase";

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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
    const updateFields = {
      publisher: trimOrNull(payload.publisher),
      brand_full: trimOrNull(payload.brand_full),
      brand_key: trimOrNull(payload.brand_key),
      target_site: trimOrNull(payload.target_site),
      style: trimOrNull(payload.style),
      brand: trimOrNull(payload.brand_full) ?? trimOrNull(payload.brand),
      pretty_link: trimOrNull(payload.pretty_link),
      logo: trimOrNull(payload.logo),
      banner: trimOrNull(payload.banner),
      banner_mobile: trimOrNull(payload.banner_mobile),
      image_1: trimOrNull(payload.image_1),
      image_2: trimOrNull(payload.image_2),
      image_3: trimOrNull(payload.image_3),
      image_4: trimOrNull(payload.image_4),
      login_button_text: trimOrNull(payload.login_button_text),
      register_button_text: trimOrNull(payload.register_button_text),
      bonus_button_text: trimOrNull(payload.bonus_button_text),
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
