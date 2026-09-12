import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type AuthUser = { id: string; username: string };
const secured = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });

export const PRODUCT_FEATURES = [
  { id: 'profile', phase: 1, title: 'Complete Profile Center', status: 'foundation', items: ['profile photo','display name','username','bio','online status','last seen','profile preview','QR/profile sharing','copy username','account ID'] },
  { id: 'chat-info', phase: 1, title: 'Complete Chat Info', status: 'foundation', items: ['contact profile','media','files','links','starred','pinned','search','notifications','disappearing messages','block','report','clear chat','delete chat','group admin controls','invite link','leave group'] },
  { id: 'message-tools', phase: 1, title: 'Advanced Message Operations', status: 'foundation', items: ['forward','copy','star/save','pin','quote','multi-select','bulk delete','bulk forward','message info','delivery/read timestamps','retry','download/share','link preview','reply preview','edited indicator'] },
  { id: 'organization', phase: 1, title: 'Conversation Organization', status: 'foundation', items: ['favorites','pinned chats','archive','unread filter','groups filter','personal filter','custom folders','mute indicators','unread badges','sorting','recently active','Saved Messages'] },
  { id: 'media', phase: 1, title: 'Media Experience', status: 'foundation', items: ['image viewer','gallery','video player','audio player','voice messages','document preview','media grid','files tab','links tab','download/share','compression','upload progress','download progress'] },
  { id: 'notifications', phase: 1, title: 'Notification Center', status: 'foundation', items: ['messages','mentions','groups','calls','friend requests','history','per-chat settings','global settings','sounds','desktop controls'] },
  { id: 'security', phase: 2, title: 'Privacy & Security Center', status: 'foundation', items: ['active devices','logout other devices','login history','password change','2FA','passkeys','app PIN','Android biometric lock','screen lock','privacy controls','blocked users','security verification','key/device management'] },
  { id: 'advanced-messaging', phase: 3, title: 'Advanced Messaging', status: 'planned', items: ['voice notes','polls','scheduled messages','disappearing messages','auto-delete','reminders','live location','location sharing','contacts','events/calendar','link previews','advanced media','audio/video/document players'] },
  { id: 'calls', phase: 4, title: 'Advanced Calls', status: 'foundation', items: ['incoming UI','outgoing UI','history','missed calls','mute','speaker','camera','screen sharing','group calling','call notifications'] },
  { id: 'ai', phase: 5, title: 'AI Workspace', status: 'foundation', items: ['rewrite','translation','reply suggestions','conversation summary','AI message search','AI assistant','file understanding','voice transcription','smart notifications'] },
  { id: 'search', phase: 1, title: 'Universal Search', status: 'foundation', items: ['people','chats','messages','files','photos','links','groups','sender/date/type/attachment filters'] },
  { id: 'command-center', phase: 1, title: 'Command Center', status: 'foundation', items: ['recent conversations','unread','calls','groups','saved','files','AI assistant','security status','active devices','quick actions'] },
  { id: 'settings', phase: 1, title: 'Settings Center', status: 'foundation', items: ['account','privacy','security','notifications','appearance','chat','storage','language','about'] }
] as const;

export async function registerProductCenterRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const auth = secured(app);

  app.get('/api/product/features', auth, async () => PRODUCT_FEATURES);

  app.get('/api/account/sessions', auth, async request => {
    const userId = (request.user as AuthUser).id;
    return prisma.userSession.findMany({ where: { userId, revokedAt: null }, orderBy: { lastSeenAt: 'desc' }, select: { id: true, deviceName: true, platform: true, userAgent: true, ipAddress: true, createdAt: true, lastSeenAt: true, expiresAt: true } });
  });

  app.delete<{ Params: { id: string } }>('/api/account/sessions/:id', auth, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const session = await prisma.userSession.findFirst({ where: { id: request.params.id, userId, revokedAt: null } });
    if (!session) return reply.notFound('Session not found');
    await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return { ok: true };
  });

  app.post('/api/account/sessions/revoke-others', auth, async (request: any) => {
    const userId = (request.user as AuthUser).id;
    const currentSessionId = typeof request.body?.currentSessionId === 'string' ? request.body.currentSessionId : null;
    const result = await prisma.userSession.updateMany({ where: { userId, revokedAt: null, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) }, data: { revokedAt: new Date() } });
    return { ok: true, revoked: result.count };
  });

  app.get('/api/privacy/settings', auth, async request => {
    const userId = (request.user as AuthUser).id;
    return prisma.user.findUnique({ where: { id: userId }, select: { privacyLastSeen: true, privacyProfilePhoto: true } });
  });

  app.patch('/api/privacy/settings', auth, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = z.object({ privacyLastSeen: z.enum(['everyone','contacts','nobody']).optional(), privacyProfilePhoto: z.enum(['everyone','contacts','nobody']).optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid privacy settings');
    return prisma.user.update({ where: { id: userId }, data: parsed.data, select: { privacyLastSeen: true, privacyProfilePhoto: true } });
  });

  app.get('/api/media', auth, async request => {
    const userId = (request.user as AuthUser).id;
    const q = request.query as { conversationId?: string; type?: string; limit?: string };
    const limit = Math.min(Math.max(Number(q.limit ?? 100), 1), 300);
    const memberships = await prisma.conversationMember.findMany({ where: { userId, ...(q.conversationId ? { conversationId: q.conversationId } : {}) }, select: { conversationId: true } });
    const ids = memberships.map(x => x.conversationId);
    return prisma.message.findMany({ where: { conversationId: { in: ids }, attachmentUrl: { not: null }, ...(q.type ? { attachmentMime: { startsWith: q.type } } : {}) }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, conversationId: true, senderId: true, body: true, type: true, attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true, createdAt: true } });
  });

  app.get('/api/search/universal', auth, async request => {
    const userId = (request.user as AuthUser).id;
    const q = String((request.query as any)?.q ?? '').trim();
    if (q.length < 2) return { people: [], chats: [], messages: [], files: [], links: [], groups: [] };
    const members = await prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true } });
    const ids = members.map(x => x.conversationId);
    const [people, messages] = await Promise.all([
      prisma.user.findMany({ where: { id: { not: userId }, OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }, take: 25, select: { id: true, username: true, displayName: true, avatarUrl: true } }),
      prisma.message.findMany({ where: { conversationId: { in: ids }, body: { contains: q, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, conversationId: true, senderId: true, body: true, type: true, attachmentUrl: true, attachmentName: true, attachmentMime: true, createdAt: true } })
    ]);
    const chats = await prisma.conversation.findMany({ where: { id: { in: ids }, OR: [{ title: { contains: q, mode: 'insensitive' } }, { isGroup: q.toLowerCase() === 'group' }] }, take: 25, select: { id: true, title: true, isGroup: true, updatedAt: true } });
    return { people, chats, messages, files: messages.filter(x => Boolean(x.attachmentUrl)), links: messages.filter(x => /https?:\/\//i.test(x.body)), groups: chats.filter(x => x.isGroup) };
  });
}
