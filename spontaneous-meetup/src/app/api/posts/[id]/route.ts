import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id: postId } = await params;

  const { error: dbError } = await sb
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id); // ownership enforced server-side

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
