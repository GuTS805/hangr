-- ─────────────────────────────────────────────────────────────────
-- hangr · Supabase schema
-- Run this in the Supabase SQL Editor after creating your project
-- ─────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────────
create table public.profiles (
  id               uuid references auth.users on delete cascade primary key,
  name             text not null default '',
  age              int,
  avatar           text default '',
  city             text default 'Ghaziabad',
  neighborhood     text default '',
  interests        text[] default '{}',
  gender           text,
  show_gender      boolean default true,
  is_verified      boolean default true,   -- Google OAuth = verified
  college_verified boolean default false,
  trust_score      numeric(3,1) default 0,
  review_count     int default 0,
  is_free          boolean default false,
  free_until       timestamptz,
  last_lat         double precision,
  last_lng         double precision,
  onboarded        boolean default false,  -- false until they fill age/interests
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Groups ────────────────────────────────────────────────────────
create table public.groups (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  topic            text not null,
  created_by       uuid references public.profiles(id) on delete set null,
  location_name    text not null default '',
  neighborhood     text not null default '',
  planned_time     text not null default '',
  max_members      int not null default 10,
  female_only      boolean default false,
  is_public        boolean default true,
  safe_location_id text default '',
  final_location_id text,
  voting_open      boolean default true,
  expires_at       timestamptz default now() + interval '4 hours',
  created_at       timestamptz default now()
);

-- ── Group members ─────────────────────────────────────────────────
create table public.group_members (
  group_id  uuid references public.groups(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ── Messages ──────────────────────────────────────────────────────
create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid references public.groups(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  user_name   text not null,
  user_avatar text not null default '',
  text        text not null,
  created_at  timestamptz default now()
);

-- ── Location votes ────────────────────────────────────────────────
create table public.location_votes (
  group_id    uuid references public.groups(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  location_id text not null,
  voted_at    timestamptz default now(),
  primary key (group_id, user_id)
);

-- ── Reviews ───────────────────────────────────────────────────────
create table public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id   uuid references public.profiles(id) on delete cascade,
  group_id     uuid references public.groups(id) on delete set null,
  rating       int check (rating between 1 and 5),
  comment      text default '',
  created_at   timestamptz default now()
);

-- ── Reports ───────────────────────────────────────────────────────
create table public.reports (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  target_id   uuid not null,
  target_type text check (target_type in ('user', 'group')),
  reason      text not null,
  created_at  timestamptz default now()
);

-- ── Blocked users ─────────────────────────────────────────────────
create table public.blocked_users (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ── Pings ────────────────────────────────────────────────────────
create table public.pings (
  id           uuid primary key default uuid_generate_v4(),
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id   uuid references public.profiles(id) on delete cascade,
  message      text,
  status       text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.messages       enable row level security;
alter table public.location_votes enable row level security;
alter table public.reviews        enable row level security;
alter table public.reports        enable row level security;
alter table public.blocked_users  enable row level security;
alter table public.pings          enable row level security;

-- profiles
create policy "profiles_read_all"    on public.profiles for select using (true);
create policy "profiles_insert_own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- groups
create policy "groups_read_all"      on public.groups for select using (true);
create policy "groups_insert_auth"   on public.groups for insert with check (auth.uid() is not null);
create policy "groups_update_own"    on public.groups for update using (auth.uid() = created_by);
create policy "groups_delete_own"    on public.groups for delete using (auth.uid() = created_by);

-- group_members
create policy "gm_read_all"     on public.group_members for select using (true);
create policy "gm_insert_own"   on public.group_members for insert with check (auth.uid() = user_id);
create policy "gm_delete_own"   on public.group_members for delete using (auth.uid() = user_id);

-- messages
create policy "msg_read_all"    on public.messages for select using (true);
create policy "msg_insert_own"  on public.messages for insert with check (auth.uid() = user_id);

-- location_votes
create policy "votes_read_all"   on public.location_votes for select using (true);
create policy "votes_insert_own" on public.location_votes for insert with check (auth.uid() = user_id);
create policy "votes_update_own" on public.location_votes for update using (auth.uid() = user_id);
create policy "votes_delete_own" on public.location_votes for delete using (auth.uid() = user_id);

-- reviews
create policy "reviews_read_all"   on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = from_user_id);

-- reports (only own reports visible)
create policy "reports_insert"    on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_read_own"  on public.reports for select using (auth.uid() = reporter_id);

-- blocked_users
create policy "blocks_read_own"   on public.blocked_users for select using (auth.uid() = blocker_id);
create policy "blocks_insert_own" on public.blocked_users for insert with check (auth.uid() = blocker_id);
create policy "blocks_delete_own" on public.blocked_users for delete using (auth.uid() = blocker_id);

-- pings
create policy "pings_read_own"   on public.pings for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "pings_insert_own" on public.pings for insert with check (auth.uid() = from_user_id);
create policy "pings_update_own" on public.pings for update using (auth.uid() = to_user_id);

-- ── Auto-create profile on signup ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar, is_verified, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    true,
    false
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Indexes ───────────────────────────────────────────────────────
create index idx_groups_expires      on public.groups(expires_at desc);
create index idx_messages_group      on public.messages(group_id, created_at asc);
create index idx_gm_group            on public.group_members(group_id);
create index idx_reviews_to_user     on public.reviews(to_user_id);
create index idx_profiles_free       on public.profiles(is_free) where is_free = true;

-- ── Enable realtime ───────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.groups;
