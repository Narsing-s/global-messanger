-- Run after applying 20261119120000_gm_stories_profiles_privacy.sql.
-- Read-only structural verification; no application records are modified.
DO $$
BEGIN
  IF to_regclass('public.gm_stories') IS NULL
     OR to_regclass('public.gm_story_audience') IS NULL
     OR to_regclass('public.gm_story_views') IS NULL
     OR to_regclass('public.gm_story_reactions') IS NULL THEN
    RAISE EXCEPTION 'Missing one or more Global Messenger story tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid IN (
      'public.gm_stories'::regclass,
      'public.gm_story_audience'::regclass,
      'public.gm_story_views'::regclass,
      'public.gm_story_reactions'::regclass
    ) AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every story table';
  END IF;

  IF has_table_privilege('anon','public.gm_stories','SELECT')
     OR has_table_privilege('anon','public.gm_story_audience','SELECT')
     OR has_table_privilege('anon','public.gm_story_views','SELECT')
     OR has_table_privilege('anon','public.gm_story_reactions','SELECT') THEN
    RAISE EXCEPTION 'Anonymous role has direct story-table access';
  END IF;

  IF has_column_privilege('authenticated','public.gm_profiles','auth_user_id','SELECT')
     OR has_column_privilege('authenticated','public.gm_profiles','bio','SELECT')
     OR has_column_privilege('authenticated','public.gm_profiles','last_seen_at','SELECT')
     OR has_column_privilege('authenticated','public.gm_profiles','avatar_url','SELECT') THEN
    RAISE EXCEPTION 'A protected profile field can be read directly';
  END IF;

  IF NOT has_function_privilege('authenticated','public.gm_get_profile_details(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.gm_can_view_story(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.gm_get_profile_details_impl(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated role is missing required privacy helper access';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='gm_get_profile_details'
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Public profile RPC must remain SECURITY INVOKER';
  END IF;

  IF has_function_privilege('anon','public.gm_get_profile_details(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.gm_get_profile_details_impl(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role can execute a profile privacy function';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='gm-story-media' AND public=false
    AND file_size_limit=26214400
    AND allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']) THEN
    RAISE EXCEPTION 'Private story-media bucket or exact MIME allowlist is missing';
  END IF;

  IF to_regclass('public.gm_story_views_viewer_idx') IS NULL
     OR to_regclass('public.gm_story_reactions_user_idx') IS NULL THEN
    RAISE EXCEPTION 'Story foreign-key lookup indexes are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='gm_story_views'
      AND policyname='gm viewers record own story views'
      AND with_check ILIKE '%read_receipts%'
  ) THEN
    RAISE EXCEPTION 'Story-view insertion does not respect read-receipt privacy';
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN
    ('gm_stories','gm_story_audience','gm_story_views','gm_story_reactions')) AS story_rls_policy_count,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.gm_stories'::regclass) AS stories_rls_enabled,
  (SELECT public FROM storage.buckets WHERE id='gm-story-media') AS story_bucket_is_public;
