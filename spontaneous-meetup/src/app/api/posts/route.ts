import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { INTERESTS } from "@/lib/mock-data";

const VALID_TOPICS = new Set([...INTERESTS as unknown as string[], null, undefined]);
const MAX_TEXT = 500;
const MAX_IMAGE_B64 = 2 * 1024 * 1024; // ~1.5 MB decoded

export async function POST(req: NextRequest) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { text, imageBase64, topic } = body as Record<string, unknown>;

  if (typeof text !== "string" || text.trim().length === 0)
    return NextResponse.json({ error: "Post text is required" }, { status: 400 });

  if (text.trim().length > MAX_TEXT)
    return NextResponse.json({ error: `Text must be ${MAX_TEXT} characters or less` }, { status: 400 });

  if (imageBase64 !== undefined && imageBase64 !== null) {
    if (typeof imageBase64 !== "string")
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    if (imageBase64.length > MAX_IMAGE_B64)
      return NextResponse.json({ error: "Image too large (max ~1.5 MB)" }, { status: 400 });
  }

  if (topic !== undefined && topic !== null && !VALID_TOPICS.has(topic as string))
    return NextResponse.json({ error: "Invalid topic" }, { status: 400 });

  const { data: profile } = await sb
    .from("profiles")
    .select("name, avatar, neighborhood, is_verified")
    .eq("id", user.id)
    .single();

  const p = profile as { name?: string; avatar?: string; neighborhood?: string; is_verified?: boolean } | null;

  const { data, error: dbError } = await sb.from("posts").insert({
    user_id: user.id,
    user_name: p?.name ?? "User",
    user_avatar: p?.avatar ?? "",
    user_neighborhood: p?.neighborhood ?? "",
    user_is_verified: p?.is_verified ?? false,
    text: text.trim(),
    image_base64: imageBase64 ?? null,
    topic: topic ?? null,
    likes: [],
  }).select("*, post_comments(*)").single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ post: data }, { status: 201 });
}
