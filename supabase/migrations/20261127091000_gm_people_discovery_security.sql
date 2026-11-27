CREATE OR REPLACE FUNCTION private.gm_search_profiles_impl(search_term text, result_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, username text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH input AS (
    SELECT lower(btrim(coalesce(search_term, ''))) AS term,
           least(greatest(coalesce(result_limit, 20), 1), 50) AS row_limit
  )
  SELECT p.id, p.username, p.display_name
  FROM public.gm_profiles p
  CROSS JOIN input i
  WHERE auth.uid() IS NOT NULL
    AND private.gm_current_profile_id() IS NOT NULL
    AND length(i.term) >= 2
    AND p.id <> private.gm_current_profile_id()
    AND coalesce(private.gm_is_profile_visible(p.id), true)
    AND NOT private.gm_is_blocked(p.id)
    AND (
      position(i.term in lower(p.username)) > 0
      OR position(i.term in lower(coalesce(p.display_name, ''))) > 0
    )
  ORDER BY
    CASE WHEN lower(p.username) = i.term THEN 0
         WHEN lower(p.username) LIKE i.term || '%' THEN 1
         ELSE 2 END,
    lower(coalesce(p.display_name, p.username))
  LIMIT (SELECT row_limit FROM input);
$$;

REVOKE ALL ON FUNCTION private.gm_search_profiles_impl(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.gm_search_profiles_impl(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.gm_search_profiles(search_term text, result_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, username text, display_name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT * FROM private.gm_search_profiles_impl(search_term, result_limit);
$$;

REVOKE ALL ON FUNCTION public.gm_search_profiles(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_search_profiles(text, integer) TO authenticated;