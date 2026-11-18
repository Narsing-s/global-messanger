-- Create groups atomically through an authenticated RPC wrapper.
-- Privileged implementation lives in the non-exposed private schema.
create or replace function private.gm_create_group_conversation_impl(group_title text, member_users uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_auth_id uuid := auth.uid();
  v_me uuid;
  v_conversation uuid;
  v_members uuid[];
  v_existing_count integer;
begin
  if v_auth_id is null then raise exception 'Authentication required'; end if;
  select id into v_me from public.gm_profiles where auth_user_id = v_auth_id;
  if v_me is null then raise exception 'Messenger profile not found. Please sign in again.'; end if;
  if nullif(btrim(group_title), '') is null or length(btrim(group_title)) > 80 then
    raise exception 'Enter a group name between 1 and 80 characters.';
  end if;
  select coalesce(array_agg(distinct x), array[]::uuid[]) into v_members
  from unnest(coalesce(member_users, array[]::uuid[])) as t(x)
  where x is not null and x <> v_me;
  if coalesce(array_length(v_members, 1), 0) < 1 then raise exception 'Choose at least one other person for the group.'; end if;
  if array_length(v_members, 1) > 99 then raise exception 'A group can contain at most 100 members.'; end if;
  select count(*) into v_existing_count from public.gm_profiles p where p.id = any(v_members);
  if v_existing_count <> array_length(v_members, 1) then raise exception 'One or more selected accounts are no longer available.'; end if;
  if exists (select 1 from unnest(v_members) as t(user_id) where private.gm_is_blocked(t.user_id)) then
    raise exception 'A blocked account cannot be added to this group.';
  end if;
  insert into public.gm_conversations(title, is_group, creator_id)
  values (btrim(group_title), true, v_me) returning id into v_conversation;
  insert into public.gm_conversation_members(conversation_id, user_id)
  select v_conversation, v_me union all select v_conversation, unnest(v_members);
  return v_conversation;
end;
$$;
revoke all on function private.gm_create_group_conversation_impl(text, uuid[]) from public, anon;
grant execute on function private.gm_create_group_conversation_impl(text, uuid[]) to authenticated;

create or replace function public.gm_create_group_conversation(group_title text, member_users uuid[])
returns uuid
language sql
security invoker
set search_path = private, public, pg_temp
as $$
  select private.gm_create_group_conversation_impl(group_title, member_users);
$$;
revoke all on function public.gm_create_group_conversation(text, uuid[]) from public, anon;
grant execute on function public.gm_create_group_conversation(text, uuid[]) to authenticated;
