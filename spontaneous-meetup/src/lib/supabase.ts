import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient stores the session in cookies so it works
// correctly with Next.js App Router (server + client share the same session)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Row-level types (snake_case from DB) ──────────────────────────

export interface ProfileRow {
  id: string;
  name: string;
  age: number | null;
  avatar: string;
  city: string;
  neighborhood: string;
  interests: string[];
  gender: string | null;
  show_gender: boolean;
  is_verified: boolean;
  college_verified: boolean;
  trust_score: number;
  review_count: number;
  is_free: boolean;
  free_until: string | null;
  last_lat: number | null;
  last_lng: number | null;
  onboarded: boolean;
  phone: string | null;
  created_at: string;
  status_text: string | null;
  streak_days: number | null;
  last_active_date: string | null;
  total_meetups: number | null;
  photo_verified_at: string | null;
  verification_selfie_url: string | null;
  bio: string | null;
}

export interface GroupRow {
  id: string;
  name: string;
  topic: string;
  created_by: string | null;
  location_name: string;
  neighborhood: string;
  planned_time: string;
  max_members: number;
  female_only: boolean;
  is_public: boolean;
  safe_location_id: string;
  final_location_id: string | null;
  voting_open: boolean;
  expires_at: string;
  created_at: string;
  group_members?: { profiles: ProfileRow }[];
  location_votes?: { user_id: string; location_id: string }[];
}

export interface MessageRow {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_neighborhood: string;
  user_is_verified: boolean;
  text: string;
  image_url: string | null;
  image_base64: string | null;  // legacy
  likes: string[];
  topic: string | null;
  created_at: string;
  post_comments?: CommentRow[];
}

export interface PingRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profiles?: { name: string; avatar: string; is_verified: boolean } | null;
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at: string;
}
