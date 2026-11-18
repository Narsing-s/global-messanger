-- Start or reuse a direct conversation atomically for the authenticated Messenger profile.
create or replace function public.gm_start_direct_conversation(target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_auth_id uuid := auth.uid();
  v_me uuid;
  v_conversation uuid;
begin
  if v_auth_id is null then
    raise exception 'Authentication required';
  end if;
  select id into v_me from public.gm_profiles where auth_user_id = v_auth_id;
  if v_me is null then
    raise exception 'Messenger profile not found. Please sign in again.';
  end if;
  if target_user is null or target_user = v_me then
    raise exception 'Choose another user to start a chat.';
  end if;
  if not exists (select 1 from public.gm_profiles where id = target_user) then
    raise exception 'This user is no longer available.';
  end if;
  if not private.gm_is_profile_visible(target_user) then
    raise exception 'This user is not accepting new conversations.';
  end if;
  if private.gm_is_blocked(target_user) then
    raise exception 'This conversation cannot be started because one of the accounts has blocked the other.';
  end if;

  select c.id into v_conversation
  from public.gm_conversations c
  join public.gm_conversation_members mine
    on mine.conversation_id = c.id and mine.user_id = v_me
  join public.gm_conversation_members peer
    on peer.conversation_id = c.id and peer.user_id = target_user
  where c.is_group = false
  order by c.updated_at desc
  limit 1;

  if v_conversation is null then
    insert into public.gm_conversations(is_group, creator_id)
    values(false, v_me)
    returning id into v_conversation;
    insert into public.gm_conversation_members(conversation_id,user_id)
    values (v_conversation,v_me),(v_conversation,target_user);
  end if;
  return v_conversation;
end;
$$;
revoke all on function public.gm_start_direct_conversation(uuid) from public, anon;
grant execute on function public.gm_start_direct_conversation(uuid) to authenticated;
