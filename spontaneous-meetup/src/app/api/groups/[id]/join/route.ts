import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id: groupId } = await params;

  const { data: group, error: gErr } = await sb
    .from("groups")
    .select("*, group_members(user_id), female_only, max_members, expires_at")
    .eq("id", groupId)
    .single();

  if (gErr || !group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (new Date(group.expires_at) <= new Date())
    return NextResponse.json({ error: "Group has expired" }, { status: 400 });

  const members = (group.group_members ?? []) as { user_id: string }[];
  if (members.some((m) => m.user_id === user.id))
    return NextResponse.json({ error: "Already a member" }, { status: 400 });

  if (members.length >= group.max_members)
    return NextResponse.json({ error: "Group is full" }, { status: 400 });

  if (group.female_only) {
    const { data: profile } = await sb.from("profiles").select("gender").eq("id", user.id).single();
    if ((profile as { gender?: string } | null)?.gender !== "Female")
      return NextResponse.json({ error: "This group is for women only" }, { status: 403 });
  }

  const { error: insertErr } = await sb.from("group_members").insert({ group_id: groupId, user_id: user.id });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
