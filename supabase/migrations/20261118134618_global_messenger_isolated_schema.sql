-- Global Messenger: Supabase PostgreSQL foundation.
-- Apply with: supabase db push
-- Existing D1 UUIDs are retained in gm_profiles.id / gm_conversations.id / gm_messages.id.
-- Password hashes are intentionally NOT imported: Supabase Auth owns credentials.

create extension if not exists pgcrypto;

create table if not exists public.gm_profiles (
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

create table if not exists public.gm_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  creator_id uuid references public.gm_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gm_conversation_members (
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.gm_messages (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  sender_id uuid not null references public.gm_profiles(id) on delete cascade,
  body text not null default '',
  type text not null default 'text',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists messages_sender_client
  on public.gm_messages(sender_id, client_id) where client_id is not null;
create index if not exists messages_conversation_created
  on public.gm_messages(conversation_id, created_at desc);
create index if not exists members_user on public.gm_conversation_members(user_id);
create index if not exists conversations_updated on public.gm_conversations(updated_at desc);

create table if not exists public.gm_message_reactions (
  message_id uuid not null references public.gm_messages(id) on delete cascade,
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists reactions_message on public.gm_message_reactions(message_id);

create table if not exists public.gm_bookmarks (
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  message_id uuid not null references public.gm_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists bookmarks_user on public.gm_bookmarks(user_id, created_at desc);

create table if not exists public.gm_pinned_messages (
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  message_id uuid not null references public.gm_messages(id) on delete cascade,
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id, user_id)
);
create index if not exists pins_conversation on public.gm_pinned_messages(conversation_id, created_at desc);

-- Push tokens are per installation; never expose them to other users.
create table if not exists public.gm_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  platform text not null check (platform in ('android','ios','web')),
  token text not null unique,
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.gm_user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  device_name text,
  platform text,
  public_key text,
  trusted boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.gm_conversation_preferences (
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  muted_until timestamptz,
  archived boolean not null default false,
  favorite boolean not null default false,
  pinned boolean not null default false,
  disappearing_seconds integer check (disappearing_seconds is null or disappearing_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.gm_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  message_id uuid references public.gm_messages(id) on delete set null,
  uploader_id uuid not null references public.gm_profiles(id) on delete cascade,
  bucket_id text not null default 'gm-chat-media',
  object_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique(bucket_id, object_path)
);

create table if not exists public.gm_scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  sender_id uuid not null references public.gm_profiles(id) on delete cascade,
  body text not null,
  message_type text not null default 'text',
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_messages_due on public.gm_scheduled_messages(scheduled_for) where sent_at is null and cancelled_at is null;

create table if not exists public.gm_polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.gm_conversations(id) on delete cascade,
  message_id uuid references public.gm_messages(id) on delete cascade,
  creator_id uuid not null references public.gm_profiles(id) on delete cascade,
  question text not null,
  multiple_choice boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.gm_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.gm_polls(id) on delete cascade,
  label text not null,
  position integer not null default 0
);
create table if not exists public.gm_poll_votes (
  poll_option_id uuid not null references public.gm_poll_options(id) on delete cascade,
  user_id uuid not null references public.gm_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_option_id, user_id)
);

create table if not exists public.gm_user_blocks (
  blocker_id uuid not null references public.gm_profiles(id) on delete cascade,
  blocked_id uuid not null references public.gm_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.gm_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.gm_profiles(id) on delete cascade,
  reported_user_id uuid references public.gm_profiles(id) on delete set null,
  message_id uuid references public.gm_messages(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.gm_current_profile_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.gm_profiles where auth_user_id = auth.uid() limit 1 $$;

create or replace function public.gm_is_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.gm_conversation_members
  where conversation_id = target_conversation and user_id = public.gm_current_profile_id()
) $$;

create or replace function public.gm_touch_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists gm_profiles_touch_updated_at on public.gm_profiles;
create trigger gm_profiles_touch_updated_at before update on public.gm_profiles
for each row execute function public.gm_touch_updated_at();
drop trigger if exists gm_conversations_touch_updated_at on public.gm_conversations;
create trigger gm_conversations_touch_updated_at before update on public.gm_conversations
for each row execute function public.gm_touch_updated_at();

-- Attach a newly authenticated Supabase identity to a legacy profile by username,
-- preserving the existing profile/conversation/message UUIDs after D1 import.
create or replace function public.gm_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare uname text;
begin
  if coalesce(new.raw_user_meta_data->>'app','') <> 'global-messenger' then
    return new;
  end if;
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1));
  if uname !~ '^[A-Za-z0-9_.-]{3,24}$' then
    uname := 'user_' || replace(substr(new.id::text,1,8),'-','');
  end if;
  update public.gm_profiles
     set auth_user_id = new.id,
         email = coalesce(new.email, email),
         display_name = coalesce(nullif(new.raw_user_meta_data->>'display_name',''), display_name)
   where lower(username) = lower(uname) and auth_user_id is null;
  if not found then
    insert into public.gm_profiles(auth_user_id, username, email, display_name)
    values(new.id, uname, new.email, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), uname))
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists gm_on_auth_user_created_global_messenger on auth.users;
create trigger gm_on_auth_user_created_global_messenger
after insert on auth.users for each row execute function public.gm_handle_new_auth_user();

-- RLS: every user-facing table is protected. Service-role credentials must stay server-side.
alter table public.gm_profiles enable row level security;
alter table public.gm_conversations enable row level security;
alter table public.gm_conversation_members enable row level security;
alter table public.gm_messages enable row level security;
alter table public.gm_message_reactions enable row level security;
alter table public.gm_bookmarks enable row level security;
alter table public.gm_pinned_messages enable row level security;
alter table public.gm_device_tokens enable row level security;
alter table public.gm_user_devices enable row level security;
alter table public.gm_conversation_preferences enable row level security;
alter table public.gm_attachments enable row level security;
alter table public.gm_scheduled_messages enable row level security;
alter table public.gm_polls enable row level security;
alter table public.gm_poll_options enable row level security;
alter table public.gm_poll_votes enable row level security;
alter table public.gm_user_blocks enable row level security;
alter table public.gm_user_reports enable row level security;

create policy "gm_profiles readable by authenticated users" on public.gm_profiles
for select to authenticated using (true);
create policy "gm profile owner updates own profile" on public.gm_profiles
for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy "members can read gm_conversations" on public.gm_conversations
for select to authenticated using (public.gm_is_conversation_member(id));
create policy "authenticated users create gm_conversations" on public.gm_conversations
for insert to authenticated with check (creator_id = public.gm_current_profile_id());
create policy "gm members can read memberships" on public.gm_conversation_members
for select to authenticated using (public.gm_is_conversation_member(conversation_id));
create policy "gm conversation creator adds members" on public.gm_conversation_members
for insert to authenticated with check (
  user_id = public.gm_current_profile_id()
  or exists (select 1 from public.gm_conversations c where c.id = conversation_id and c.creator_id = public.gm_current_profile_id())
);
create policy "members can read gm_messages" on public.gm_messages
for select to authenticated using (public.gm_is_conversation_member(conversation_id));
create policy "gm members can send as self" on public.gm_messages
for insert to authenticated with check (
  sender_id = public.gm_current_profile_id() and public.gm_is_conversation_member(conversation_id)
);
create policy "sender edits own gm_messages" on public.gm_messages
for update to authenticated using (sender_id = public.gm_current_profile_id()) with check (sender_id = public.gm_current_profile_id());
create policy "sender deletes own gm_messages" on public.gm_messages
for delete to authenticated using (sender_id = public.gm_current_profile_id());

create policy "gm members read reactions" on public.gm_message_reactions
for select to authenticated using (exists (select 1 from public.gm_messages m where m.id = message_id and public.gm_is_conversation_member(m.conversation_id)));
create policy "gm users manage own reactions" on public.gm_message_reactions
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "users manage own gm_bookmarks" on public.gm_bookmarks
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "gm members read pins" on public.gm_pinned_messages
for select to authenticated using (public.gm_is_conversation_member(conversation_id));
create policy "gm users manage own pins" on public.gm_pinned_messages
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());

create policy "gm users manage own device tokens" on public.gm_device_tokens
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "gm users manage own devices" on public.gm_user_devices
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "gm users manage own conversation preferences" on public.gm_conversation_preferences
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "members read gm_attachments" on public.gm_attachments
for select to authenticated using (public.gm_is_conversation_member(conversation_id));
create policy "members upload their own gm_attachments" on public.gm_attachments
for insert to authenticated with check (uploader_id = public.gm_current_profile_id() and public.gm_is_conversation_member(conversation_id));
create policy "senders manage their scheduled gm_messages" on public.gm_scheduled_messages
for all to authenticated using (sender_id = public.gm_current_profile_id()) with check (sender_id = public.gm_current_profile_id() and public.gm_is_conversation_member(conversation_id));
create policy "members read gm_polls" on public.gm_polls
for select to authenticated using (public.gm_is_conversation_member(conversation_id));
create policy "members create gm_polls" on public.gm_polls
for insert to authenticated with check (creator_id = public.gm_current_profile_id() and public.gm_is_conversation_member(conversation_id));
create policy "gm members read poll options" on public.gm_poll_options
for select to authenticated using (exists (select 1 from public.gm_polls p where p.id = poll_id and public.gm_is_conversation_member(p.conversation_id)));
create policy "gm poll creators manage options" on public.gm_poll_options
for all to authenticated using (exists (select 1 from public.gm_polls p where p.id = poll_id and p.creator_id = public.gm_current_profile_id()))
with check (exists (select 1 from public.gm_polls p where p.id = poll_id and p.creator_id = public.gm_current_profile_id()));
create policy "gm members read poll votes" on public.gm_poll_votes
for select to authenticated using (exists (select 1 from public.gm_poll_options o join public.gm_polls p on p.id = o.poll_id where o.id = poll_option_id and public.gm_is_conversation_member(p.conversation_id)));
create policy "gm users manage own poll votes" on public.gm_poll_votes
for all to authenticated using (user_id = public.gm_current_profile_id()) with check (user_id = public.gm_current_profile_id());
create policy "gm users manage blocks they create" on public.gm_user_blocks
for all to authenticated using (blocker_id = public.gm_current_profile_id()) with check (blocker_id = public.gm_current_profile_id());
create policy "gm users create reports" on public.gm_user_reports
for insert to authenticated with check (reporter_id = public.gm_current_profile_id());
create policy "gm users read own reports" on public.gm_user_reports
for select to authenticated using (reporter_id = public.gm_current_profile_id());

-- Private media bucket. Object path convention: <conversation-uuid>/<uploader-uuid>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gm-chat-media','gm-chat-media',false,52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','audio/mpeg','audio/mp4','audio/ogg','application/pdf','text/plain'])
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "gm conversation members read chat media" on storage.objects
for select to authenticated using (
  bucket_id = 'gm-chat-media'
  and public.gm_is_conversation_member((storage.foldername(name))[1]::uuid)
);
create policy "gm conversation members upload own chat media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'gm-chat-media'
  and public.gm_is_conversation_member((storage.foldername(name))[1]::uuid)
  and (storage.foldername(name))[2] = public.gm_current_profile_id()::text
);
create policy "gm users delete their own chat media" on storage.objects
for delete to authenticated using (
  bucket_id = 'gm-chat-media'
  and (storage.foldername(name))[2] = public.gm_current_profile_id()::text
);

-- Realtime publication is configured from Supabase Dashboard after applying the schema:
-- enable gm_conversations, gm_conversation_members, gm_messages, gm_message_reactions, gm_polls, gm_poll_votes.

-- Isolate profile data and never expose email to other authenticated users.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.gm_profiles FROM authenticated;
GRANT SELECT (id,auth_user_id,username,display_name,avatar_url,last_seen_at,created_at,updated_at) ON public.gm_profiles TO authenticated;
GRANT UPDATE (display_name,bio,avatar_url) ON public.gm_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gm_conversations, public.gm_conversation_members, public.gm_messages, public.gm_message_reactions, public.gm_bookmarks, public.gm_pinned_messages, public.gm_device_tokens, public.gm_user_devices, public.gm_conversation_preferences, public.gm_attachments, public.gm_scheduled_messages, public.gm_polls, public.gm_poll_options, public.gm_poll_votes, public.gm_user_blocks, public.gm_user_reports TO authenticated;
UPDATE storage.buckets SET allowed_mime_types = NULL WHERE id = 'gm-chat-media';

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

CREATE OR REPLACE FUNCTION public.gm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.gm_handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gm_current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_current_profile_id() TO authenticated;
REVOKE ALL ON FUNCTION public.gm_is_conversation_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_is_conversation_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.gm_touch_updated_at() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='gm_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gm_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='gm_conversation_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gm_conversation_members;
  END IF;
END $$;

-- E2EE public keys are discoverable only between users who share a conversation.
CREATE UNIQUE INDEX IF NOT EXISTS gm_user_devices_user_device_unique ON public.gm_user_devices(user_id,device_name);
CREATE POLICY "gm conversation members can read device public keys" ON public.gm_user_devices
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.gm_conversation_members m
    WHERE m.user_id = gm_user_devices.user_id
      AND public.gm_is_conversation_member(m.conversation_id)
  )
);
GRANT SELECT (user_id,device_name,public_key,platform,last_seen_at) ON public.gm_user_devices TO authenticated;

-- Public profile avatars are separate from private conversation media.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('gm-avatars','gm-avatars',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'];
CREATE POLICY "gm users upload own avatars" ON storage.objects
FOR INSERT TO authenticated WITH CHECK(bucket_id='gm-avatars' AND (storage.foldername(name))[1]=public.gm_current_profile_id()::text);
CREATE POLICY "gm users update own avatars" ON storage.objects
FOR UPDATE TO authenticated USING(bucket_id='gm-avatars' AND (storage.foldername(name))[1]=public.gm_current_profile_id()::text)
WITH CHECK(bucket_id='gm-avatars' AND (storage.foldername(name))[1]=public.gm_current_profile_id()::text);
CREATE POLICY "gm users delete own avatars" ON storage.objects
FOR DELETE TO authenticated USING(bucket_id='gm-avatars' AND (storage.foldername(name))[1]=public.gm_current_profile_id()::text);

CREATE TABLE IF NOT EXISTS public.gm_privacy_settings(
 user_id uuid PRIMARY KEY REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 profile_visibility boolean NOT NULL DEFAULT true,
 read_receipts boolean NOT NULL DEFAULT true,
 online_status boolean NOT NULL DEFAULT true,
 last_seen_visibility boolean NOT NULL DEFAULT true,
 typing_indicators boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm users manage own privacy settings" ON public.gm_privacy_settings
FOR ALL TO authenticated USING(user_id=public.gm_current_profile_id())
WITH CHECK(user_id=public.gm_current_profile_id());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gm_privacy_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.gm_is_profile_visible(target_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT coalesce((SELECT profile_visibility FROM public.gm_privacy_settings WHERE user_id=target_user),true) $$;
REVOKE ALL ON FUNCTION public.gm_is_profile_visible(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gm_is_profile_visible(uuid) TO authenticated;
DROP POLICY IF EXISTS "gm_profiles readable by authenticated users" ON public.gm_profiles;
CREATE POLICY "gm profile visibility controls discovery" ON public.gm_profiles
FOR SELECT TO authenticated USING(auth_user_id=auth.uid() OR public.gm_is_profile_visible(id));

CREATE POLICY "gm users update own read marker" ON public.gm_conversation_members
FOR UPDATE TO authenticated USING(user_id=public.gm_current_profile_id())
WITH CHECK(user_id=public.gm_current_profile_id());

-- Support, entities, login history, notification center and WebRTC call signaling.
CREATE TABLE IF NOT EXISTS public.gm_call_signals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES public.gm_conversations(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 call_id text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_call_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm members read call signals" ON public.gm_call_signals FOR SELECT TO authenticated USING(public.gm_is_conversation_member(conversation_id));
CREATE POLICY "gm members send own call signals" ON public.gm_call_signals FOR INSERT TO authenticated WITH CHECK(sender_id=public.gm_current_profile_id() AND public.gm_is_conversation_member(conversation_id));
GRANT SELECT,INSERT ON public.gm_call_signals TO authenticated;
CREATE INDEX IF NOT EXISTS gm_call_signals_conversation_created_idx ON public.gm_call_signals(conversation_id,created_at DESC);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='gm_call_signals') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.gm_call_signals; END IF; END $$;

CREATE TABLE IF NOT EXISTS public.gm_support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 subject text NOT NULL CHECK(length(subject) BETWEEN 3 AND 160),category text NOT NULL DEFAULT 'general',
 description text NOT NULL CHECK(length(description) BETWEEN 10 AND 10000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm users create support tickets" ON public.gm_support_tickets FOR INSERT TO authenticated WITH CHECK(user_id=public.gm_current_profile_id());
CREATE POLICY "gm users read own support tickets" ON public.gm_support_tickets FOR SELECT TO authenticated USING(user_id=public.gm_current_profile_id());
GRANT SELECT,INSERT ON public.gm_support_tickets TO authenticated;

CREATE TABLE IF NOT EXISTS public.gm_global_entities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(length(kind) BETWEEN 2 AND 48),title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_global_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm users manage own global entities" ON public.gm_global_entities FOR ALL TO authenticated USING(owner_id=public.gm_current_profile_id()) WITH CHECK(owner_id=public.gm_current_profile_id());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gm_global_entities TO authenticated;

CREATE TABLE IF NOT EXISTS public.gm_login_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 event text NOT NULL CHECK(event IN ('login','logout','password_changed')),user_agent text,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm users read own login history" ON public.gm_login_history FOR SELECT TO authenticated USING(user_id=public.gm_current_profile_id());
CREATE POLICY "gm users insert own login history" ON public.gm_login_history FOR INSERT TO authenticated WITH CHECK(user_id=public.gm_current_profile_id());
GRANT SELECT,INSERT ON public.gm_login_history TO authenticated;

CREATE TABLE IF NOT EXISTS public.gm_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES public.gm_profiles(id) ON DELETE SET NULL,conversation_id uuid REFERENCES public.gm_conversations(id) ON DELETE CASCADE,
 message_id uuid REFERENCES public.gm_messages(id) ON DELETE CASCADE,type text NOT NULL DEFAULT 'message',
 title text NOT NULL,body text NOT NULL DEFAULT '',read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gm_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm users read own notifications" ON public.gm_notifications FOR SELECT TO authenticated USING(user_id=public.gm_current_profile_id());
CREATE POLICY "gm users update own notifications" ON public.gm_notifications FOR UPDATE TO authenticated USING(user_id=public.gm_current_profile_id()) WITH CHECK(user_id=public.gm_current_profile_id());
GRANT SELECT,UPDATE ON public.gm_notifications TO authenticated;
CREATE OR REPLACE FUNCTION public.gm_notify_conversation_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
 INSERT INTO public.gm_notifications(user_id,actor_id,conversation_id,message_id,type,title,body)
 SELECT cm.user_id,NEW.sender_id,NEW.conversation_id,NEW.id,
   CASE WHEN NEW.type IN ('call-log','call-signal') THEN 'call' ELSE 'message' END,
   CASE WHEN NEW.type='call-log' THEN 'Call activity' ELSE 'New message' END,left(coalesce(NEW.body,''),240)
 FROM public.gm_conversation_members cm
 WHERE cm.conversation_id=NEW.conversation_id AND cm.user_id<>NEW.sender_id
 AND NOT EXISTS(SELECT 1 FROM public.gm_conversation_preferences cp WHERE cp.user_id=cm.user_id AND cp.conversation_id=NEW.conversation_id AND cp.muted_until>now());
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gm_notify_conversation_message() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gm_notify_message_insert ON public.gm_messages;
CREATE TRIGGER gm_notify_message_insert AFTER INSERT ON public.gm_messages FOR EACH ROW EXECUTE FUNCTION public.gm_notify_conversation_message();

-- Enforce user blocks in the database, not just the UI.
CREATE POLICY "gm prevent membership creation across blocks" ON public.gm_conversation_members
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 NOT EXISTS(SELECT 1 FROM public.gm_user_blocks b WHERE
  (b.blocker_id=public.gm_current_profile_id() AND b.blocked_id=gm_conversation_members.user_id)
  OR (b.blocked_id=public.gm_current_profile_id() AND b.blocker_id=gm_conversation_members.user_id))
);
CREATE POLICY "gm prevent message send across blocks" ON public.gm_messages
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 NOT EXISTS(SELECT 1 FROM public.gm_conversation_members cm JOIN public.gm_user_blocks b
  ON (b.blocker_id=cm.user_id AND b.blocked_id=public.gm_current_profile_id())
  OR (b.blocked_id=cm.user_id AND b.blocker_id=public.gm_current_profile_id())
  WHERE cm.conversation_id=gm_messages.conversation_id AND cm.user_id<>public.gm_current_profile_id())
);
CREATE POLICY "gm prevent message move outside own conversations" ON public.gm_messages
AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.gm_is_conversation_member(conversation_id))
WITH CHECK(sender_id=public.gm_current_profile_id() AND public.gm_is_conversation_member(conversation_id));

-- Scheduled messages are dispatched by Supabase Cron once per minute.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
CREATE OR REPLACE FUNCTION public.gm_process_scheduled_messages()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE sent_count integer;
BEGIN
 WITH due AS MATERIALIZED (
  SELECT id,conversation_id,sender_id,body,message_type FROM public.gm_scheduled_messages
  WHERE scheduled_for<=now() AND sent_at IS NULL AND cancelled_at IS NULL
  ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT 100
 ), inserted AS (
  INSERT INTO public.gm_messages(conversation_id,sender_id,body,type,metadata)
  SELECT conversation_id,sender_id,body,message_type,jsonb_build_object('scheduled',true) FROM due RETURNING id
 )
 UPDATE public.gm_scheduled_messages s SET sent_at=now() FROM due WHERE s.id=due.id;
 GET DIAGNOSTICS sent_count=ROW_COUNT;
 RETURN sent_count;
END $$;
REVOKE ALL ON FUNCTION public.gm_process_scheduled_messages() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='gm-process-scheduled-messages') THEN
  PERFORM cron.schedule('gm-process-scheduled-messages','* * * * *','select public.gm_process_scheduled_messages();');
 END IF;
END $$;
