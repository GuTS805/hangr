import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { INTERESTS } from "@/lib/mock-data";
import { SAFE_LOCATIONS } from "@/lib/mock-data";

const VALID_TOPICS = new Set(INTERESTS as unknown as string[]);
const VALID_LOCATION_IDS = new Set(SAFE_LOCATIONS.map((l) => l.id));

export async function POST(req: NextRequest) {
  const { user, sb, error } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, topic, safeLocationId, location, plannedTime, femaleOnly } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 60)
    return NextResponse.json({ error: "Group name must be 3–60 characters" }, { status: 400 });

  if (typeof topic !== "string" || !VALID_TOPICS.has(topic))
    return NextResponse.json({ error: "Invalid topic" }, { status: 400 });

  if (typeof safeLocationId !== "string" || !VALID_LOCATION_IDS.has(safeLocationId))
    return NextResponse.json({ error: "Invalid safe location" }, { status: 400 });

  if (typeof plannedTime !== "string" || plannedTime.trim().length === 0)
    return NextResponse.json({ error: "plannedTime is required" }, { status: 400 });

  const { data: profile } = await sb.from("profiles").select("neighborhood").eq("id", user.id).single();

  const { data, error: dbError } = await sb.from("groups").insert({
    name: name.trim(),
    topic,
    created_by: user.id,
    location_name: typeof location === "string" ? location.trim().slice(0, 100) : "",
    neighborhood: (profile as { neighborhood?: string } | null)?.neighborhood ?? "",
    planned_time: plannedTime.trim().slice(0, 60),
    safe_location_id: safeLocationId,
    female_only: femaleOnly === true,
    is_public: true,
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await sb.from("group_members").insert({ group_id: data.id, user_id: user.id });
  await sb.from("location_votes").insert({ group_id: data.id, user_id: user.id, location_id: safeLocationId });

  return NextResponse.json({ group: data }, { status: 201 });
}
