-- Global Messenger: Supabase PostgreSQL foundation.
-- Apply with: supabase db push
-- Existing D1 UUIDs are retained in profiles.id / conversations.id / messages.id.
-- Password hashes are intentionally NOT imported: Supabase Auth owns credentials.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,24}$'),
  email text unique,
  display_name text not null,
  bio text,
  avatar_url text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  type text not null default 'text',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists messages_sender_client
  on public.messages(sender_id, client_id) where client_id is not null;
create index if not exists messages_conversation_created
  on public.messages(conversation_id, created_at desc);
create index if not exists members_user on public.conversation_members(user_id);
create index if not exists conversations_updated on public.conversations(updated_at desc);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists reactions_message on public.message_reactions(message_id);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists bookmarks_user on public.bookmarks(user_id, created_at desc);

create table if not exists public.pinned_messages (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id, user_id)
);
create index if not exists pins_conversation on public.pinned_messages(conversation_id, created_at desc);

-- Push tokens are per installation; never expose them to other users.
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('android','ios','web')),
  token text not null unique,
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  platform text,
  public_key text,
  trusted boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_preferences (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_until timestamptz,
  archived boolean not null default false,
  favorite boolean not null default false,
  pinned boolean not null default false,
  disappearing_seconds integer check (disappearing_seconds is null or disappearing_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  bucket_id text not null default 'gm-chat-media',
  object_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique(bucket_id, object_path)
);

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  message_type text not null default 'text',
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_messages_due on public.scheduled_messages(scheduled_for) where sent_at is null and cancelled_at is null;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  multiple_choice boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null default 0
);
create table if not exists public.poll_votes (
  poll_option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_option_id, user_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.profiles where auth_user_id = auth.uid() limit 1 $$;

create or replace function public.is_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.conversation_members
  where conversation_id = target_conversation and user_id = public.current_profile_id()
) $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at before update on public.conversations
for each row execute function public.touch_updated_at();

-- Attach a newly authenticated Supabase identity to a legacy profile by username,
-- preserving the existing profile/conversation/message UUIDs after D1 import.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1));
  if uname !~ '^[A-Za-z0-9_.-]{3,24}$' then
    uname := 'user_' || replace(substr(new.id::text,1,8),'-','');
  end if;
  update public.profiles
     set auth_user_id = new.id,
         email = coalesce(new.email, email),
         display_name = coalesce(nullif(new.raw_user_meta_data->>'display_name',''), display_name)
   where lower(username) = lower(uname) and auth_user_id is null;
  if not found then
    insert into public.profiles(auth_user_id, username, email, display_name)
    values(new.id, uname, new.email, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), uname))
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_global_messenger on auth.users;
create trigger on_auth_user_created_global_messenger
after insert on auth.users for each row execute function public.handle_new_auth_user();

-- RLS: every user-facing table is protected. Service-role credentials must stay server-side.
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.pinned_messages enable row level security;
alter table public.device_tokens enable row level security;
alter table public.user_devices enable row level security;
alter table public.conversation_preferences enable row level security;
alter table public.attachments enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;

create policy "gm profiles readable by authenticated users" on public.profiles
for select to authenticated using (true);
create policy "gm profile owner updates own profile" on public.profiles
for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy "gm members can read conversations" on public.conversations
for select to authenticated using (public.is_conversation_member(id));
create policy "gm authenticated users create conversations" on public.conversations
for insert to authenticated with check (creator_id = public.current_profile_id());
create policy "gm members can read memberships" on public.conversation_members
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "gm conversation creator adds members" on public.conversation_members
for insert to authenticated with check (
  user_id = public.current_profile_id()
  or exists (select 1 from public.conversations c where c.id = conversation_id and c.creator_id = public.current_profile_id())
);
create policy "gm members can read messages" on public.messages
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "gm members can send as self" on public.messages
for insert to authenticated with check (
  sender_id = public.current_profile_id() and public.is_conversation_member(conversation_id)
);
create policy "gm sender edits own messages" on public.messages
for update to authenticated using (sender_id = public.current_profile_id()) with check (sender_id = public.current_profile_id());
create policy "gm sender deletes own messages" on public.messages
for delete to authenticated using (sender_id = public.current_profile_id());

create policy "gm members read reactions" on public.message_reactions
for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "gm users manage own reactions" on public.message_reactions
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm users manage own bookmarks" on public.bookmarks
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm members read pins" on public.pinned_messages
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "gm users manage own pins" on public.pinned_messages
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

create policy "gm users manage own device tokens" on public.device_tokens
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm users manage own devices" on public.user_devices
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm users manage own conversation preferences" on public.conversation_preferences
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm members read attachments" on public.attachments
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "gm members upload their own attachments" on public.attachments
for insert to authenticated with check (uploader_id = public.current_profile_id() and public.is_conversation_member(conversation_id));
create policy "gm senders manage their scheduled messages" on public.scheduled_messages
for all to authenticated using (sender_id = public.current_profile_id()) with check (sender_id = public.current_profile_id() and public.is_conversation_member(conversation_id));
create policy "gm members read polls" on public.polls
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "gm members create polls" on public.polls
for insert to authenticated with check (creator_id = public.current_profile_id() and public.is_conversation_member(conversation_id));
create policy "gm members read poll options" on public.poll_options
for select to authenticated using (exists (select 1 from public.polls p where p.id = poll_id and public.is_conversation_member(p.conversation_id)));
create policy "gm poll creators manage options" on public.poll_options
for all to authenticated using (exists (select 1 from public.polls p where p.id = poll_id and p.creator_id = public.current_profile_id()))
with check (exists (select 1 from public.polls p where p.id = poll_id and p.creator_id = public.current_profile_id()));
create policy "gm members read poll votes" on public.poll_votes
for select to authenticated using (exists (select 1 from public.poll_options o join public.polls p on p.id = o.poll_id where o.id = poll_option_id and public.is_conversation_member(p.conversation_id)));
create policy "gm users manage own poll votes" on public.poll_votes
for all to authenticated using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy "gm users manage blocks they create" on public.user_blocks
for all to authenticated using (blocker_id = public.current_profile_id()) with check (blocker_id = public.current_profile_id());
create policy "gm users create reports" on public.user_reports
for insert to authenticated with check (reporter_id = public.current_profile_id());
create policy "gm users read own reports" on public.user_reports
for select to authenticated using (reporter_id = public.current_profile_id());

-- Private media bucket. Object path convention: <conversation-uuid>/<uploader-uuid>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gm-chat-media','gm-chat-media',false,52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','audio/mpeg','audio/mp4','audio/ogg','application/pdf','text/plain'])
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "gm conversation members read chat media" on storage.objects
for select to authenticated using (
  bucket_id = 'gm-chat-media'
  and public.is_conversation_member((storage.foldername(name))[1]::uuid)
);
create policy "gm conversation members upload own chat media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'gm-chat-media'
  and public.is_conversation_member((storage.foldername(name))[1]::uuid)
  and (storage.foldername(name))[2] = public.current_profile_id()::text
);
create policy "gm users delete their own chat media" on storage.objects
for delete to authenticated using (
  bucket_id = 'gm-chat-media'
  and (storage.foldername(name))[2] = public.current_profile_id()::text
);

-- Realtime publication is configured from Supabase Dashboard after applying the schema:
-- enable conversations, conversation_members, messages, message_reactions, polls, poll_votes.

-- Restrict profile visibility to non-sensitive fields. Email remains server-side.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.gm_profiles FROM authenticated;
GRANT SELECT (id,auth_user_id,username,display_name,avatar_url,last_seen_at,created_at,updated_at) ON public.gm_profiles TO authenticated;
GRANT UPDATE (display_name,bio,avatar_url) ON public.gm_profiles TO authenticated;
UPDATE storage.buckets SET allowed_mime_types = NULL WHERE id = 'gm-chat-media';

-- Avoid username collisions during public sign-up.
CREATE OR REPLACE FUNCTION public.gm_handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uname text;
BEGIN
  IF coalesce(new.raw_user_meta_data->>'app','') <> 'global-messenger' THEN RETURN new; END IF;
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1));
  IF uname !~ '^[A-Za-z0-9_.-]{3,24}$' THEN uname := 'user_' || replace(substr(new.id::text,1,8),'-',''); END IF;
  IF EXISTS(SELECT 1 FROM public.gm_profiles p WHERE lower(p.username)=lower(uname) AND p.auth_user_id IS DISTINCT FROM new.id) THEN
    uname := left(uname,15) || '_' || substr(replace(new.id::text,'-',''),1,8);
  END IF;
  UPDATE public.gm_profiles SET auth_user_id=new.id,email=coalesce(new.email,email),
    display_name=coalesce(nullif(new.raw_user_meta_data->>'display_name',''),display_name)
    WHERE lower(username)=lower(uname) AND auth_user_id IS NULL;
  IF NOT FOUND THEN
    INSERT INTO public.gm_profiles(auth_user_id,username,email,display_name)
    VALUES(new.id,uname,new.email,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),uname))
    ON CONFLICT(auth_user_id) DO NOTHING;
  END IF;
  RETURN new;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gm_conversations, public.gm_conversation_members, public.gm_messages, public.gm_message_reactions, public.gm_bookmarks, public.gm_pinned_messages, public.gm_device_tokens, public.gm_user_devices, public.gm_conversation_preferences, public.gm_attachments, public.gm_scheduled_messages, public.gm_polls, public.gm_poll_options, public.gm_poll_votes, public.gm_user_blocks, public.gm_user_reports TO authenticated;
