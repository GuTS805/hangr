import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export function createServerClient(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
      auth: { persistSession: false },
    }
  );
}

export async function requireAuth(req: NextRequest) {
  const sb = createServerClient(req);
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return { user: null, sb, error: "Unauthorized" };
  return { user, sb, error: null };
}
