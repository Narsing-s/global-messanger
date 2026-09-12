export type SearchKind =
  | 'people'
  | 'chats'
  | 'messages'
  | 'files'
  | 'photos'
  | 'videos'
  | 'links'
  | 'groups'
  | 'saved'
  | 'pinned';

export type SearchFilters = {
  kind?: SearchKind;
  senderId?: string;
  conversationId?: string;
  from?: string;
  to?: string;
  hasAttachment?: boolean;
  hasLink?: boolean;
  messageType?: string;
};

export const searchFeature = {
  id: 'search',
  scope: [
    'people','chats','messages','files','photos','videos','links','groups',
    'saved','pinned','sender-filter','date-filter','type-filter',
    'attachment-filter','link-filter','search-history','in-conversation'
  ] as const
};

export function normalizeSearchFilters(filters: SearchFilters = {}): SearchFilters {
  return {
    ...filters,
    senderId: filters.senderId?.trim() || undefined,
    conversationId: filters.conversationId?.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    messageType: filters.messageType?.trim() || undefined
  };
}
