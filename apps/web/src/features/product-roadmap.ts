export type ProductPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ProductFeature = { id: string; phase: ProductPhase; title: string; category: string; items: string[]; status: 'active' | 'foundation' | 'next'; };

export const PRODUCT_ROADMAP: ProductFeature[] = [
  { id:'profile', phase:1, category:'Profile', title:'Complete Profile Center', status:'foundation', items:['Change profile photo','Display name','Username','About / bio','Online-status controls','Last-seen controls','Profile preview','QR/profile sharing','QR scanner','Copy username','Username availability','Account ID','Contact discovery','Profile privacy','Account export','Account deletion'] },
  { id:'chat-info', phase:1, category:'Chats', title:'Complete Chat Info', status:'foundation', items:['Contact profile','Media','Files','Links','Starred messages','Pinned messages','Search in conversation','Notifications','Disappearing messages','Block','Report','Clear chat','Delete chat','Chat wallpaper','Per-chat notification policy','Per-chat auto-delete policy','Group photo','Group description','Members','Admin controls','Add/remove members','Promote/demote admin','Group permissions','Invite link','Join requests','Ownership transfer','Leave group'] },
  { id:'message-operations', phase:1, category:'Messages', title:'Advanced Message Menu', status:'foundation', items:['Forward','Copy','Star/save','Pin/unpin','Quote/reply preview','Multi-select','Bulk delete','Bulk forward','Message info','Delivered/read timestamps','Retry failed message','Save/download/share attachment','Link preview','Edited indicator','Delete for me','Delete for everyone','Message reminders','Scheduled-message management'] },
  { id:'organization', phase:1, category:'Chats', title:'Conversation Organization', status:'foundation', items:['Favorites','Pinned chats','Archive','Unread filter','Groups filter','Personal filter','Custom folders','Folder reorder','Mute indicators','Unread badges','Sorting','Recently active','Recently added','Saved Messages','Drafts','Mention counters'] },
  { id:'media', phase:1, category:'Media', title:'Complete Media Center', status:'foundation', items:['Full-screen image viewer','Image gallery','Video player','Audio player','Voice messages','Waveform playback','Pause/resume/cancel recording','Document preview','PDF preview','Media grid','Files tab','Links tab','Download/share','Image compression','Upload progress','Download progress','Retry uploads','Auto-download','Storage manager','Cache cleanup','Multi-attachment selection'] },
  { id:'notifications', phase:1, category:'Notifications', title:'Notification Center', status:'foundation', items:['Message notifications','Mention notifications','Group notifications','Call notifications','Friend/request notifications','Notification history','Mark/clear read','Per-chat settings','Global settings','Sound selection','Vibration','Desktop controls','Android push','Notification grouping','Do-not-disturb','Preview controls','Mention-only mode'] },
  { id:'search', phase:1, category:'Search', title:'Universal Search', status:'foundation', items:['People','Chats','Messages','Files','Photos','Links','Groups','Saved messages','Pinned messages','Sender filter','Date filter','Type filter','Attachment filter','Link filter','Search history','Search in conversation'] },
  { id:'command-center', phase:1, category:'Dashboard', title:'Command Center', status:'foundation', items:['Recent conversations','Unread messages','Calls','Groups','Saved messages','Files','AI assistant','Security status','Active devices','Quick actions','Favorites','Pending requests','Scheduled messages','Universal search'] },
  { id:'settings', phase:1, category:'Settings', title:'Complete Settings', status:'foundation', items:['Account','Privacy','Security','Notifications','Appearance','Chat','Storage','Language','Accessibility','Calls','Media','AI','Devices','About','Open source','Privacy policy','Terms','Help center'] },
  { id:'security', phase:2, category:'Security', title:'Privacy & Security Center', status:'foundation', items:['Active sessions/devices','Logout other devices','Login history','Change password','Two-factor authentication','Recovery codes','Passkeys','App PIN','Android biometric lock','Screen-lock behavior','Privacy controls','Blocked users','Security verification','Encryption status','Device key management','Key rotation','Key revocation','New-device verification','Session expiration','Token revocation','Suspicious-login detection'] },
  { id:'advanced-messaging', phase:3, category:'Advanced Messaging', title:'Advanced Messaging', status:'next', items:['Voice notes','Polls','Scheduled messages','Disappearing messages','Auto-delete','Message reminders','Live location','Location sharing','Contact sharing','Calendar/events','Link previews','Advanced media handling','Audio player','Video player','Document preview','Message reactions/details','Rich previews'] },
  { id:'calls', phase:4, category:'Calls', title:'Advanced Calls', status:'foundation', items:['Incoming-call UI','Outgoing-call UI','Ringing state','Accept/reject','Mute','Speaker','Camera control','Camera switch','Screen sharing','Call duration','Call history','Missed calls','Reconnect/recovery','Network quality','Group calls','Participant management','Call notifications','Call permissions'] },
  { id:'ai', phase:5, category:'AI', title:'AI Workspace', status:'foundation', items:['AI rewrite','AI translation','AI reply suggestions','AI conversation summary','AI message search','AI chat assistant','AI file/document understanding','AI voice transcription','AI smart notifications','Compose assistance','Action extraction','Long-chat summaries'] },
  { id:'platform', phase:6, category:'Platform', title:'Messenger Platform Expansion', status:'next', items:['Stories/status','Channels','Communities','Broadcast lists','Bots and bot API','Mini-app/integration framework','Public profiles','Public groups','Group discovery','Invite-link discovery','Announcements','Admin/moderation dashboard','Report queue','Anti-spam controls','Abuse/rate-limit controls'] },
  { id:'sync-backup', phase:6, category:'Data & Sync', title:'Multi-device Sync and Backup', status:'next', items:['Multi-device sessions','Cross-device message sync','Read-state sync','Draft sync','Settings sync','Device trust','Cloud backup','Encrypted backup','Backup restore','Media backup','Export chat','Export account data','Import/restore validation','Conflict resolution','Offline queue recovery'] },
  { id:'contacts', phase:6, category:'Contacts', title:'Contact and Identity Layer', status:'next', items:['Contact discovery','Phone/email verification','QR scanner','QR profile sharing','Username availability','Contact requests','Contact labels','Block/report workflow','Privacy exceptions'] },
  { id:'commerce', phase:6, category:'Integrations', title:'Payments and Integrations', status:'next', items:['Payment intents','Payment status','Receipts','Refund state','Provider abstraction','Webhook verification','Bot payments','Mini-app integrations','Calendar integrations','Maps/location integrations'] },
  { id:'accessibility', phase:7, category:'Accessibility', title:'Accessibility and Quality', status:'next', items:['Keyboard navigation','Screen-reader labels','Focus management','Reduced motion','High contrast','Font scaling','Touch target validation','Color-independent status indicators','Localization QA','RTL readiness','Error recovery UX'] },
  { id:'production', phase:7, category:'Production', title:'Production Hardening', status:'next', items:['Secrets validation','Authorization audit','Rate limiting','Abuse protection','Upload validation','Secure headers','CORS/CSRF review','Session/token revocation','Database migrations','Backup/restore drills','Structured logging','Error monitoring','Health/readiness checks','WebSocket recovery','Push reliability','Android production configuration','Dependency security','E2E regression suite','API contract tests','Deployment smoke tests'] }
];

export const PHASE_LABELS: Record<ProductPhase,string> = {
  1:'Core product completeness',
  2:'Privacy & security',
  3:'Advanced messaging',
  4:'Advanced calls',
  5:'AI',
  6:'Platform, sync, integrations and ecosystem',
  7:'Accessibility and production excellence'
};

/**
 * Extra product areas found during the repository cross-check that are easy to
 * miss when comparing only against a WhatsApp-style checklist. Keep these in
 * the same registry so future UI work cannot silently omit them.
 */
export const MISSED_PRODUCT_AREAS = [
  'Stories/status',
  'Channels',
  'Communities',
  'Broadcast lists',
  'Bots and bot API',
  'Mini-app/integration framework',
  'Payments and receipts',
  'Cloud backup/restore',
  'Multi-device synchronization',
  'Device trust and key rotation/revocation',
  'Contact discovery and QR scanner',
  'Admin/moderation dashboard',
  'Anti-spam and abuse controls',
  'Accessibility center',
  'Localization/RTL readiness',
  'Account export/import',
  'Offline queue/conflict recovery',
  'Call history and group-call participant state',
  'Storage/media management',
  'Production observability and dependency security'
] as const;
