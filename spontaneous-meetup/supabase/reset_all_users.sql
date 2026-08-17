-- ─────────────────────────────────────────────────────────────────
-- FULL RESET — wipes every signed-up account and everything tied to it.
-- Run this manually in Supabase Dashboard → SQL Editor.
-- THIS IS IRREVERSIBLE. Only run it if you actually want a clean slate.
-- ─────────────────────────────────────────────────────────────────

-- Deleting from auth.users cascades (on delete cascade) through:
--   profiles → group_members, messages, location_votes, reviews,
--              reports, blocked_users, pings, posts, post_comments
delete from auth.users;

-- groups.created_by is "on delete set null", not cascade — so group
-- shells survive with no members/creator unless we clear them too.
delete from public.groups;

-- Optional but recommended: also empty the storage buckets so no
-- orphaned files (old avatars/selfies/post images) are left behind.
-- Do this from Dashboard → Storage → select bucket → select all → delete,
-- for: post-images, verification-selfies
