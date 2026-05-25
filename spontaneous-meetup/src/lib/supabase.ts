import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
  created_at: string;
  status_text: string | null;
  streak_days: number | null;
  last_active_date: string | null;
  total_meetups: number | null;
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

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at: string;
}
