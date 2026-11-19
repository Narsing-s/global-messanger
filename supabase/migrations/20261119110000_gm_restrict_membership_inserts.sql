-- Close the membership self-join vulnerability.
-- All supported membership creation flows are performed atomically by the
-- SECURITY DEFINER implementations behind gm_start_direct_conversation and
-- gm_create_group_conversation. Authenticated clients must not insert rows
-- directly, including a row that makes themselves a member of an existing chat.

DROP POLICY IF EXISTS "gm conversation creator adds members"
  ON public.gm_conversation_members;

REVOKE INSERT ON TABLE public.gm_conversation_members
  FROM anon, authenticated;
