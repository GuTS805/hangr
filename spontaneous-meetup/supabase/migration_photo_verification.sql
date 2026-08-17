-- ── Photo verification ──────────────────────────────────────────────
-- Replaces the old "Google account = verified" / "OTP = verified" logic.
-- is_verified is now earned only by passing live selfie + face-match
-- verification against the user's profile photo (client-side, face-api.js).

alter table public.profiles alter column is_verified set default false;
alter table public.profiles add column if not exists photo_verified_at timestamptz;
alter table public.profiles add column if not exists verification_selfie_url text;

-- Selfies are private — only the owner can read/write their own folder,
-- unlike the public post-images bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-selfies',
  'verification-selfies',
  false,
  2097152,                             -- 2 MB limit per file
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create policy "storage_verification_selfies_insert" on storage.objects
  for insert with check (
    bucket_id = 'verification-selfies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_verification_selfies_select" on storage.objects
  for select using (
    bucket_id = 'verification-selfies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_verification_selfies_delete" on storage.objects
  for delete using (
    bucket_id = 'verification-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
