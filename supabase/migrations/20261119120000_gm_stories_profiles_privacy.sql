-- Premium social layer for Global Messenger.
-- All objects and storage rules are isolated to gm_* / gm-story-media.
-- This migration is intentionally not applied to the shared production project
-- until the pull request's database and two-account tests have passed.

ALTER TABLE public.gm_privacy_settings
  ADD COLUMN IF NOT EXISTS about_visibility text NOT NULL DEFAULT 'everyone'
    CHECK (about_visibility IN ('everyone','nobody')),
  ADD COLUMN IF NOT EXISTS default_story_audience text NOT NULL DEFAULT 'everyone'
    CHECK (default_story_audience IN ('everyone','selected','except','only_me')),
  ADD COLUMN IF NOT EXISTS save_stories_to_archive boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.gm_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text','image','video')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 1200),
  media_path text,
  background_theme text NOT NULL DEFAULT 'aurora' CHECK (background_theme IN ('aurora','ocean','sunset','midnight','rose','forest')),
  audience_mode text NOT NULL DEFAULT 'everyone' CHECK (audience_mode IN ('everyone','selected','except','only_me')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((media_type = 'text' AND media_path IS NULL) OR (media_type IN ('image','video') AND media_path IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS gm_stories_author_created_idx
  ON public.gm_stories(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gm_stories_expiry_idx
  ON public.gm_stories(expires_at) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.gm_story_audience (
  story_id uuid NOT NULL REFERENCES public.gm_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
  audience_type text NOT NULL CHECK (audience_type IN ('include','exclude')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id,user_id),
  CHECK (user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gm_story_audience_user_idx
  ON public.gm_story_audience(user_id,story_id);

CREATE TABLE IF NOT EXISTS public.gm_story_views (
  story_id uuid NOT NULL REFERENCES public.gm_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id,viewer_id)
);
CREATE INDEX IF NOT EXISTS gm_story_views_story_idx
  ON public.gm_story_views(story_id,viewed_at DESC);

CREATE TABLE IF NOT EXISTS public.gm_story_reactions (
  story_id uuid NOT NULL REFERENCES public.gm_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.gm_profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id,user_id)
);

ALTER TABLE public.gm_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_story_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_story_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.gm_can_view_story(target_story uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gm_stories s
    WHERE s.id = target_story
      AND (
        s.author_id = private.gm_current_profile_id()
        OR (
          s.archived_at IS NULL
          AND s.expires_at > now()
          AND (s.media_type = 'text' OR s.media_path IS NOT NULL)
          AND NOT private.gm_is_blocked(s.author_id)
          AND CASE s.audience_mode
            WHEN 'everyone' THEN true
            WHEN 'selected' THEN EXISTS (
              SELECT 1 FROM public.gm_story_audience a
              WHERE a.story_id = s.id
                AND a.user_id = private.gm_current_profile_id()
                AND a.audience_type = 'include'
            )
            WHEN 'except' THEN NOT EXISTS (
              SELECT 1 FROM public.gm_story_audience a
              WHERE a.story_id = s.id
                AND a.user_id = private.gm_current_profile_id()
                AND a.audience_type = 'exclude'
            )
            ELSE false
          END
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION private.gm_can_view_story(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.gm_can_view_story(uuid) TO authenticated;

DROP POLICY IF EXISTS "gm story author or selected audience reads stories" ON public.gm_stories;
CREATE POLICY "gm story author or selected audience reads stories"
  ON public.gm_stories FOR SELECT TO authenticated
  USING (author_id = private.gm_current_profile_id() OR private.gm_can_view_story(id));
DROP POLICY IF EXISTS "gm users create own stories" ON public.gm_stories;
CREATE POLICY "gm users create own stories"
  ON public.gm_stories FOR INSERT TO authenticated
  WITH CHECK (author_id = private.gm_current_profile_id());
DROP POLICY IF EXISTS "gm users update own stories" ON public.gm_stories;
CREATE POLICY "gm users update own stories"
  ON public.gm_stories FOR UPDATE TO authenticated
  USING (author_id = private.gm_current_profile_id())
  WITH CHECK (author_id = private.gm_current_profile_id());
DROP POLICY IF EXISTS "gm users delete own stories" ON public.gm_stories;
CREATE POLICY "gm users delete own stories"
  ON public.gm_stories FOR DELETE TO authenticated
  USING (author_id = private.gm_current_profile_id());

DROP POLICY IF EXISTS "gm story owners manage audience" ON public.gm_story_audience;
CREATE POLICY "gm story owners manage audience"
  ON public.gm_story_audience FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gm_stories s WHERE s.id = story_id AND s.author_id = private.gm_current_profile_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gm_stories s WHERE s.id = story_id AND s.author_id = private.gm_current_profile_id()));

DROP POLICY IF EXISTS "gm story owners and viewers read views" ON public.gm_story_views;
CREATE POLICY "gm story owners and viewers read views"
  ON public.gm_story_views FOR SELECT TO authenticated
  USING (
    viewer_id = private.gm_current_profile_id()
    OR EXISTS (SELECT 1 FROM public.gm_stories s WHERE s.id = story_id AND s.author_id = private.gm_current_profile_id())
  );
DROP POLICY IF EXISTS "gm viewers record own story views" ON public.gm_story_views;
CREATE POLICY "gm viewers record own story views"
  ON public.gm_story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = private.gm_current_profile_id() AND private.gm_can_view_story(story_id));

DROP POLICY IF EXISTS "gm viewers read story reactions" ON public.gm_story_reactions;
CREATE POLICY "gm viewers read story reactions"
  ON public.gm_story_reactions FOR SELECT TO authenticated
  USING (private.gm_can_view_story(story_id));
DROP POLICY IF EXISTS "gm users manage own story reactions" ON public.gm_story_reactions;
CREATE POLICY "gm users manage own story reactions"
  ON public.gm_story_reactions FOR ALL TO authenticated
  USING (user_id = private.gm_current_profile_id() AND private.gm_can_view_story(story_id))
  WITH CHECK (user_id = private.gm_current_profile_id() AND private.gm_can_view_story(story_id));

REVOKE ALL ON public.gm_stories, public.gm_story_audience, public.gm_story_views, public.gm_story_reactions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gm_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gm_story_audience TO authenticated;
GRANT SELECT, INSERT ON public.gm_story_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gm_story_reactions TO authenticated;

-- Keep story media private. Object path format: <author-profile-id>/<story-id>/<filename>.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'gm-story-media','gm-story-media',false,26214400,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "gm story owners upload story media" ON storage.objects;
CREATE POLICY "gm story owners upload story media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gm-story-media'
    AND (storage.foldername(name))[1] = private.gm_current_profile_id()::text
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.gm_stories s
      WHERE s.id = ((storage.foldername(name))[2])::uuid
        AND s.author_id = private.gm_current_profile_id()
    )
  );
DROP POLICY IF EXISTS "gm story audiences read authorized story media" ON storage.objects;
CREATE POLICY "gm story audiences read authorized story media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'gm-story-media'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND private.gm_can_view_story(((storage.foldername(name))[2])::uuid)
  );
DROP POLICY IF EXISTS "gm story owners delete story media" ON storage.objects;
CREATE POLICY "gm story owners delete story media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gm-story-media'
    AND (storage.foldername(name))[1] = private.gm_current_profile_id()::text
  );

-- Prevent direct table reads from bypassing per-field profile privacy. The
-- authenticated client receives these fields only through the privacy-aware RPC.
REVOKE SELECT (auth_user_id,avatar_url,bio,last_seen_at) ON public.gm_profiles FROM authenticated;

-- Return only profile fields that the target user's privacy choices permit.
CREATE OR REPLACE FUNCTION private.gm_get_profile_details_impl(target_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_me uuid := private.gm_current_profile_id();
  v_profile public.gm_profiles%ROWTYPE;
  v_about text;
  v_last_seen boolean;
BEGIN
  IF auth.uid() IS NULL OR v_me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF target_user <> v_me AND private.gm_is_blocked(target_user) THEN
    RETURN NULL;
  END IF;
  IF target_user <> v_me AND NOT private.gm_is_profile_visible(target_user)
     AND NOT EXISTS (
       SELECT 1 FROM public.gm_conversation_members mine
       JOIN public.gm_conversation_members peer
         ON peer.conversation_id = mine.conversation_id
       WHERE mine.user_id = v_me AND peer.user_id = target_user
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.gm_stories s
       WHERE s.author_id = target_user AND private.gm_can_view_story(s.id)
     ) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_profile FROM public.gm_profiles WHERE id = target_user;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(about_visibility,'everyone'),
         coalesce(last_seen_visibility,true)
    INTO v_about,v_last_seen
    FROM public.gm_privacy_settings WHERE user_id = target_user;
  RETURN jsonb_build_object(
    'id',v_profile.id,
    'username',v_profile.username,
    'display_name',v_profile.display_name,
    'avatar_url',v_profile.avatar_url,
    'bio',CASE WHEN target_user = v_me OR coalesce(v_about,'everyone') = 'everyone' THEN v_profile.bio ELSE NULL END,
    'last_seen_at',CASE WHEN target_user = v_me OR coalesce(v_last_seen,true) THEN v_profile.last_seen_at ELSE NULL END
  );
END;
$$;
REVOKE ALL ON FUNCTION private.gm_get_profile_details_impl(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.gm_get_profile_details_impl(uuid) TO authenticated;

-- Expose only a SECURITY INVOKER RPC wrapper through the Data API.
CREATE OR REPLACE FUNCTION public.gm_get_profile_details(target_user uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.gm_get_profile_details_impl(target_user) $$;
REVOKE ALL ON FUNCTION public.gm_get_profile_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_get_profile_details(uuid) TO authenticated;
