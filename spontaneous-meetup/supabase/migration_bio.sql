-- ── Profile bio ─────────────────────────────────────────────────────
alter table public.profiles add column if not exists bio text;
