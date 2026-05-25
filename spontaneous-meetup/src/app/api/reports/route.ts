import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { REPORT_REASONS } from "@/lib/mock-data";

const VALID_REASONS = new Set(REPORT_REASONS as unknown as string[]);
const VALID_TYPES = new Set(["user", "group"]);

export async function POST(req: NextRequest) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { targetId, targetType, reason } = body as Record<string, unknown>;

  if (typeof targetId !== "string" || targetId.trim().length === 0)
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });

  if (typeof targetType !== "string" || !VALID_TYPES.has(targetType))
    return NextResponse.json({ error: "targetType must be 'user' or 'group'" }, { status: 400 });

  if (typeof reason !== "string" || !VALID_REASONS.has(reason))
    return NextResponse.json({ error: "Invalid report reason" }, { status: 400 });

  if (targetType === "user" && targetId === user.id)
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });

  const { error: dbError } = await sb.from("reports").insert({
    reporter_id: user.id,
    target_id: targetId.trim(),
    target_type: targetType,
    reason,
  });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
