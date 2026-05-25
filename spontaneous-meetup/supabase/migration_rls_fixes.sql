-- ── RLS audit fixes ──────────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor

-- ── 1. Fix post likes ─────────────────────────────────────────────────────
-- Problem: posts_update_own only lets the post OWNER update the row,
-- so any other user's like is rejected by RLS.
-- Fix: security-definer RPC that toggles a like, bypassing RLS safely.

create or replace function public.toggle_post_like(p_post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from posts where id = p_post_id and uid::text = any(likes)
  ) then
    -- remove like
    update posts set likes = array_remove(likes, uid::text) where id = p_post_id;
  else
    -- add like
    update posts set likes = array_append(likes, uid::text) where id = p_post_id;
  end if;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.toggle_post_like(uuid) to authenticated;

-- ── 2. Add missing delete policy on messages ─────────────────────────────
-- Users should be able to delete their own messages

do $$ begin
  create policy "msg_delete_own" on public.messages
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ── 3. Tighten groups insert — require non-empty name and valid topic ─────
-- (app already validates via API route, but belt-and-suspenders at DB level)
-- The existing groups_insert_auth policy (auth.uid() is not null) is fine.
-- No change needed here since mutations go through our API route.

-- ── 4. Verify storage policies exist (idempotent) ─────────────────────────
-- These were added in migration_posts_storage.sql; re-run safely.

do $$ begin
  create policy "storage_post_images_insert" on storage.objects
    for insert with check (
      bucket_id = 'post-images'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "storage_post_images_select" on storage.objects
    for select using (bucket_id = 'post-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "storage_post_images_delete" on storage.objects
    for delete using (
      bucket_id = 'post-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

-- ── 5. Index on post likes for faster contains queries ────────────────────
create index if not exists idx_posts_user on public.posts(user_id);
