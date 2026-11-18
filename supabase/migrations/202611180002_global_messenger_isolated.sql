-- Global Messenger-specific hardening and realtime setup.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.gm_profiles FROM authenticated;
GRANT SELECT (id,auth_user_id,username,display_name,avatar_url,last_seen_at,created_at,updated_at) ON public.gm_profiles TO authenticated;
GRANT UPDATE (display_name,bio,avatar_url) ON public.gm_profiles TO authenticated;
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
