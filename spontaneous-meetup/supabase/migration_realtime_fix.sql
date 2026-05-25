-- Fix real-time chat: postgres_changes filters require REPLICA IDENTITY FULL
alter table public.messages  replica identity full;
alter table public.groups    replica identity full;
alter table public.group_members replica identity full;
alter table public.posts     replica identity full;

-- Ensure messages table is in the realtime publication
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
