import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { INTERESTS } from "@/lib/mock-data";

const VALID_TOPICS = new Set([...INTERESTS as unknown as string[], null, undefined]);
const MAX_TEXT = 500;

export async function POST(req: NextRequest) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { text, imageUrl, topic } = body as Record<string, unknown>;

  if (typeof text !== "string" || text.trim().length === 0)
    return NextResponse.json({ error: "Post text is required" }, { status: 400 });

  if (text.trim().length > MAX_TEXT)
    return NextResponse.json({ error: `Text must be ${MAX_TEXT} characters or less` }, { status: 400 });

  if (imageUrl !== undefined && imageUrl !== null) {
    if (typeof imageUrl !== "string")
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    // Only allow URLs from our own Supabase Storage bucket
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!imageUrl.startsWith(`${supabaseUrl}/storage/`))
      return NextResponse.json({ error: "Image must be uploaded to app storage" }, { status: 400 });
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
    image_url: imageUrl ?? null,
    topic: topic ?? null,
    likes: [],
  }).select("*, post_comments(*)").single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ post: data }, { status: 201 });
}
