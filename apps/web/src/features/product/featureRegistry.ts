export type FeatureArea =
  | 'profile' | 'chat-info' | 'messages' | 'organization' | 'media' | 'calls'
  | 'notifications' | 'privacy' | 'security' | 'advanced-messaging' | 'search'
  | 'dashboard' | 'settings' | 'e2ee' | 'reliability' | 'performance' | 'accessibility'
  | 'moderation' | 'backup' | 'localization';

export type FeatureStatus = 'implemented' | 'partial' | 'planned';

export type ProductFeature = {
  id: string;
  area: FeatureArea;
  label: string;
  status: FeatureStatus;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  backendRequired?: boolean;
  mobileRequired?: boolean;
};

/**
 * Single source of truth for product-level completeness.
 * Keep this registry honest: a feature is `implemented` only when its UI,
 * backend behavior and relevant failure paths are covered by tests.
 */
export const PRODUCT_FEATURES: ProductFeature[] = [
  // Profile
  ['profile.photo','profile','Profile photo','partial','P0'],
  ['profile.name','profile','Display name','implemented','P0'],
  ['profile.username','profile','Username editing','planned','P0',true],
  ['profile.bio','profile','About / bio','planned','P1',true],
  ['profile.privacy','profile','Online / last-seen controls','planned','P1',true],
  ['profile.preview','profile','Profile preview','partial','P1'],
  ['profile.qr','profile','QR/profile sharing','planned','P2'],
  ['profile.copy-id','profile','Copy username / account ID','planned','P1'],

  // Chat information
  ['chat-info.contact','chat-info','Contact/group profile','partial','P0'],
  ['chat-info.media','chat-info','Shared media/files/links','partial','P0'],
  ['chat-info.starred','chat-info','Starred messages','partial','P0',true],
  ['chat-info.pinned','chat-info','Pinned messages','implemented','P0',true],
  ['chat-info.search','chat-info','Search in conversation','implemented','P0',true],
  ['chat-info.notifications','chat-info','Per-chat notifications','planned','P1',true],
  ['chat-info.disappearing','chat-info','Disappearing messages','planned','P1',true],
  ['chat-info.block','chat-info','Block/report/clear/delete chat','partial','P0',true],
  ['chat-info.group-admin','chat-info','Group admin/member controls','partial','P0',true],
  ['chat-info.invite','chat-info','Group invite link','planned','P1',true],

  // Messages
  ['messages.forward','messages','Forward','implemented','P0',true],
  ['messages.copy','messages','Copy','partial','P0'],
  ['messages.star','messages','Star/save','partial','P0',true],
  ['messages.quote','messages','Quote/reply preview','implemented','P0'],
  ['messages.multiselect','messages','Multi-select','planned','P0'],
  ['messages.bulk','messages','Bulk delete/forward/save','planned','P1',true],
  ['messages.info','messages','Message info + timestamps','partial','P0',true],
  ['messages.retry','messages','Retry failed messages','partial','P0'],
  ['messages.media-actions','messages','Save/download/share attachment','partial','P0'],
  ['messages.link-preview','messages','Safe link previews','planned','P1',true],
  ['messages.edited','messages','Edited indicator','implemented','P1'],

  // Organization
  ['organization.favorites','organization','Favorites','planned','P1',true],
  ['organization.pinned-chats','organization','Pinned chats','planned','P0',true],
  ['organization.archive','organization','Archive/unarchive chats','planned','P0',true],
  ['organization.filters','organization','Unread/groups/personal filters','partial','P0'],
  ['organization.folders','organization','Custom folders','planned','P1',true],
  ['organization.sorting','organization','Chat sorting / recently active','planned','P1'],
  ['organization.saved','organization','Saved Messages','planned','P0',true],

  // Media
  ['media.image-viewer','media','Full-screen image viewer/gallery','planned','P0'],
  ['media.video','media','Video player','planned','P0'],
  ['media.audio','media','Audio player','planned','P0'],
  ['media.voice','media','Voice notes','planned','P0',true,true],
  ['media.documents','media','Document preview','planned','P1'],
  ['media.grid','media','Media grid/files/links tabs','partial','P0'],
  ['media.progress','media','Upload/download progress','planned','P0'],
  ['media.retry','media','Cancel/retry/resume uploads','planned','P0'],
  ['media.compression','media','Client image/video compression','planned','P2'],

  // Calls
  ['calls.incoming','calls','Incoming/outgoing call UI','partial','P0'],
  ['calls.controls','calls','Mute/speaker/camera controls','partial','P0'],
  ['calls.history','calls','Call history/missed calls','partial','P0',true],
  ['calls.screen-share','calls','Screen sharing','planned','P1',true,true],
  ['calls.group','calls','Group calls','planned','P1',true,true],
  ['calls.turn','calls','TURN relay / network fallback','partial','P0',true],
  ['calls.reconnect','calls','Call reconnect/network interruption','partial','P0'],
  ['calls.permissions','calls','Permission denial/background/audio routing','planned','P0',false,true],

  // Notifications
  ['notifications.center','notifications','Notification center/history','planned','P0',true],
  ['notifications.message','notifications','Message/mention/group notifications','partial','P0',true],
  ['notifications.calls','notifications','Call notifications','partial','P0',true],
  ['notifications.settings','notifications','Per-chat/global notification settings','planned','P1',true],
  ['notifications.sound','notifications','Sound selection','planned','P2'],
  ['notifications.desktop','notifications','Desktop/browser notification controls','partial','P1'],

  // Privacy/security
  ['privacy.controls','privacy','Last seen/online/profile/read receipts/typing controls','planned','P0',true],
  ['privacy.blocked','privacy','Blocked users','planned','P0',true],
  ['security.sessions','security','Active sessions/devices + revoke','partial','P0',true],
  ['security.login-history','security','Login history','planned','P1',true],
  ['security.password-reset','security','Password reset/change','planned','P0',true],
  ['security.2fa','security','Two-factor authentication','planned','P0',true],
  ['security.passkeys','security','Passkeys/WebAuthn','partial','P1',true],
  ['security.app-lock','security','PIN/app lock','planned','P1',false,true],
  ['security.biometric','security','Android biometric lock','planned','P1',false,true],
  ['security.verification','security','Security verification / device trust','planned','P0',true],
  ['security.uploads','security','Upload MIME/size/authentication hardening','partial','P0',true],
  ['security.rate-limit','security','Rate limiting / abuse protection','partial','P0',true],
  ['security.headers','security','CORS/CSP/security headers','partial','P0',true],

  // Advanced messaging
  ['advanced.polls','advanced-messaging','Polls','planned','P1',true],
  ['advanced.scheduled','advanced-messaging','Scheduled messages','planned','P1',true],
  ['advanced.disappearing','advanced-messaging','Disappearing/auto-delete messages','planned','P1',true],
  ['advanced.reminders','advanced-messaging','Message reminders','planned','P2',true],
  ['advanced.location','advanced-messaging','Location/live location sharing','planned','P1',true,true],
  ['advanced.contacts','advanced-messaging','Contact sharing','planned','P2'],
  ['advanced.events','advanced-messaging','Calendar/events','planned','P2',true],
  ['advanced.translation','advanced-messaging','Translation','partial','P2',true],

  // Search / AI
  ['search.universal','search','Universal people/chats/messages/files/photos/links/groups search','planned','P0',true],
  ['search.advanced','search','Filter by sender/date/type/attachment/link','planned','P1',true],
  ['dashboard.command-center','dashboard','Command Center','planned','P1'],
  ['settings.center','settings','Complete settings center','partial','P0',true],
  ['ai.rewrite','advanced-messaging','AI rewrite','implemented','P2',true],
  ['ai.reply','advanced-messaging','AI reply suggestions','planned','P2',true],
  ['ai.summary','advanced-messaging','Conversation summaries','planned','P2',true],
  ['ai.search','advanced-messaging','AI semantic search','planned','P2',true],
  ['ai.documents','advanced-messaging','AI file/document understanding','planned','P2',true],
  ['ai.transcription','advanced-messaging','Voice transcription','planned','P2',true],

  // Reliability / performance
  ['e2ee.multidevice','e2ee','Multi-device E2EE key recovery','planned','P0',true,true],
  ['reliability.offline','reliability','Offline queue/retry/dedup/drafts','partial','P0',true],
  ['reliability.refresh-send','reliability','Refresh/server restart during send','planned','P0',true],
  ['reliability.media-retry','reliability','Media failure recovery/cleanup','planned','P0',true],
  ['performance.pagination','performance','Paginated/virtualized message lists','planned','P0'],
  ['performance.cache','performance','Conversation cache/optimistic UI','partial','P0'],
  ['performance.listeners','performance','Socket listener deduplication','partial','P0'],
  ['performance.db-indexes','performance','DB indexes/query profiling','partial','P0',true],

  // Often-missed product requirements
  ['accessibility.keyboard','accessibility','Keyboard navigation/focus management','planned','P1'],
  ['accessibility.screen-reader','accessibility','ARIA/screen-reader semantics','partial','P1'],
  ['accessibility.contrast','accessibility','Contrast/reduced-motion/text scaling','planned','P2'],
  ['moderation.spam','moderation','Spam/report/block/rate-limit workflows','partial','P0',true],
  ['moderation.content','moderation','Abuse reporting + moderation audit trail','planned','P1',true],
  ['backup.export','backup','Account/data export','planned','P2',true],
  ['backup.restore','backup','Backup/restore strategy','partial','P0',true],
  ['localization.languages','localization','English/Telugu/Hindi + extensible i18n','planned','P2'],
  ['localization.rtl','localization','RTL readiness','planned','P3'],
];

// Tuple helper keeps the registry readable while retaining a strongly typed public shape.
export const PRODUCT_FEATURE_CATALOG: ProductFeature[] = PRODUCT_FEATURES.map((item: any) => ({
  id: item[0], area: item[1], label: item[2], status: item[3], priority: item[4],
  backendRequired: item[5], mobileRequired: item[6]
}));

export function featuresByArea(area: FeatureArea) {
  return PRODUCT_FEATURE_CATALOG.filter(feature => feature.area === area);
}

export function incompleteFeatures() {
  return PRODUCT_FEATURE_CATALOG.filter(feature => feature.status !== 'implemented');
}
