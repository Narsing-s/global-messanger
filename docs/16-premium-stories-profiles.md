# Premium Global Messenger: Stories and Profiles

## Scope of this increment

This branch adds the first production-oriented social layer to the existing React + Vite + Capacitor application without replacing the existing chat API or conversation tables.

### Included
- Premium story strip in the chat list and a dedicated Stories navigation shortcut.
- Text, image and video stories; a 24-hour visibility window; six background themes.
- Per-story audiences: all users, selected people, everyone except selected people, or only the author.
- Story views, reactions, manual archive and a private story archive surface.
- A detailed profile sheet opened from the signed-in user's avatar and a direct-chat participant's avatar.
- Profile editing for display name, About and profile image.
- Contact information, username copy, last-seen display, mutual groups and shared media.
- Privacy controls for profile discovery, About visibility, default story audience and archive preference.
- A migration-scoped profile-details RPC so clients no longer need direct SELECT access to bio, last_seen_at, avatar_url or auth_user_id.
- Private story-media storage with a strict image/video MIME allowlist and 25 MB size cap.

## Existing systems deliberately reused

- Existing gm_profiles, gm_privacy_settings, gm_conversation_members, gm_conversations and gm_attachments.
- Existing Supabase Auth, profile UUIDs, block rules and conversation RLS.
- Existing api.searchUsers, api.direct, api.sendMessage, avatar upload and shared media records.
- Existing chat, group, call, notification and theme behavior.

No second contact system, messaging service, or separate profile identity table is introduced. The current project has no accepted-contact relationship, so the story audience selector intentionally uses explicit audience lists instead of incorrectly treating every direct conversation as a saved contact.

## Database migration

Apply supabase/migrations/20261119120000_gm_stories_profiles_privacy.sql only after reviewing the draft PR. It creates:
- gm_stories
- gm_story_audience
- gm_story_views
- gm_story_reactions
- private bucket gm-story-media
- private.gm_can_view_story(uuid), private.gm_get_profile_details_impl(uuid), and a SECURITY INVOKER public.gm_get_profile_details(uuid) wrapper

All four new tables have RLS. Anonymous access is revoked. Story visibility checks expiration, audience selection and block relationships. Story media is stored under the profile-id/story-id/filename path and is only readable when the story is visible to the signed-in viewer.

The migration also revokes direct reads of protected profile columns from authenticated. The app must deploy the privacy-aware profile RPC and API changes together with this migration.

## Verification

### Automated
- npm run build -w apps/web (GitHub Actions web build).
- Android debug build and emulator smoke workflow.
- GitGuardian check.
- supabase/tests/gm_stories_profiles_verification.sql after applying the migration in a non-production/test project.

### Required manual integration tests
Use three test accounts (A, B and C) after the migration has been applied to a test project:

1. A publishes an all-users text story. B can see it; C can see it.
2. A publishes a selected-audience story for B only. B can see it; C cannot.
3. A publishes an except-audience story excluding C. B can see it; C cannot.
4. A publishes an only-me story. Only A can see it.
5. B records a view and reacts. A sees the view/reaction; C cannot access the story or its media.
6. Expired stories disappear from other users' active story lists. A can access eligible archive entries.
7. An unrelated user cannot insert a view or reaction for a story they cannot see.
8. A direct read of protected profile columns (bio, last_seen_at, avatar_url, auth_user_id) fails for authenticated; gm_get_profile_details returns only privacy-permitted values.
9. A profile hidden from discovery remains visible only where the user has a permitted shared conversation or story.
10. Existing direct chat, group creation, realtime delivery, message send/edit/delete, media access, calls and sign-out continue to work.

## Known boundaries (not represented as shipped features)

- Stories currently expire from active visibility after 24 hours. A scheduled storage-retention cleanup job for old story media is not part of this migration; the archive UI currently limits its listing to the latest 30 days.
- Story replies, story highlights, contact-based audiences, public profile verification, QR profile sharing, group calls and a complete E2EE protocol are not added by this increment.
- The profile cover is a visual treatment, not a separately uploaded cover image.
- A successful web/Android build does not replace the three-account authorization tests above.
- The migration is not applied to the live shared Supabase project by this branch.

## Rollback

Do not roll back by dropping tables automatically after users have published stories. If the migration is deployed and must be reverted, first stop story publishing, export any required story metadata, remove the new storage objects using the Supabase Storage API, then prepare a reviewed rollback migration for the four gm_story_* tables, helper functions, policies, bucket and added privacy columns. Do not touch any non-gm_* table or bucket.
