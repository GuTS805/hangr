-- ── Posts table (if not exists) ──────────────────────────────────────
create table if not exists public.posts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.profiles(id) on delete cascade not null,
  user_name         text not null default '',
  user_avatar       text not null default '',
  user_neighborhood text not null default '',
  user_is_verified  boolean default false,
  text              text not null default '',
  image_base64      text,               -- legacy column; new posts use image_url
  image_url         text,               -- Supabase Storage public URL
  likes             text[] default '{}',
  topic             text,
  created_at        timestamptz default now()
);

-- Add image_url if posts table already exists but column is missing
alter table public.posts add column if not exists image_url text;

-- ── Post comments ──────────────────────────────────────────────────
create table if not exists public.post_comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid references public.posts(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  user_name   text not null default '',
  user_avatar text not null default '',
  text        text not null,
  created_at  timestamptz default now()
);

-- ── Profile extra columns ─────────────────────────────────────────
alter table public.profiles add column if not exists status_text    text;
alter table public.profiles add column if not exists streak_days    int default 0;
alter table public.profiles add column if not exists last_active_date date;
alter table public.profiles add column if not exists total_meetups  int default 0;

-- ── RLS for posts ─────────────────────────────────────────────────
alter table public.posts         enable row level security;
alter table public.post_comments enable row level security;

create policy "posts_read_all"    on public.posts for select using (true);
create policy "posts_insert_own"  on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own"  on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own"  on public.posts for delete using (auth.uid() = user_id);

create policy "comments_read_all"   on public.post_comments for select using (true);
create policy "comments_insert_own" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.post_comments for delete using (auth.uid() = user_id);

-- ── Storage bucket for post images ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  2097152,                             -- 2 MB limit per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload into their own folder (user_id/filename)
create policy "storage_post_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read public images
create policy "storage_post_images_select" on storage.objects
  for select using (bucket_id = 'post-images');

-- Users can only delete their own images
create policy "storage_post_images_delete" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Indexes ───────────────────────────────────────────────────────
create index if not exists idx_posts_created      on public.posts(created_at desc);
create index if not exists idx_comments_post      on public.post_comments(post_id, created_at asc);

-- ── Realtime ──────────────────────────────────────────────────────
alter publication supabase_realtime add table public.posts;
