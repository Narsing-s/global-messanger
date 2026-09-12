import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const uid = (request: any) => String(request.user?.id || '');

export async function registerActivityCenter(app: FastifyInstance, prisma: PrismaClient) {
  const protectedRoute = auth(app);

  app.get('/api/notifications/center', protectedRoute, async (request: any) => {
    const userId = uid(request);
    const limit = Math.min(Math.max(Number(request.query?.limit || 50), 1), 100);
    const memberships = await prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
    const conversationIds = memberships.map(m => m.conversationId);
    if (!conversationIds.length) return { items: [], unreadCount: 0 };
    const messages = await prisma.message.findMany({
      where: { conversationId: { in: conversationIds }, senderId: { not: userId }, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' }, take: limit,
      select: { id: true, conversationId: true, senderId: true, body: true, type: true, createdAt: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    });
    const unreadCount = memberships.reduce((total, m) => total + messages.filter(x => x.conversationId === m.conversationId && (!m.lastReadAt || x.createdAt > m.lastReadAt)).length, 0);
    return { items: messages, unreadCount };
  });

  app.post('/api/notifications/center/read', protectedRoute, async (request: any, reply) => {
    const userId = uid(request);
    const conversationId = String(request.body?.conversationId || '');
    if (!conversationId) return reply.badRequest('conversationId is required');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.forbidden('Not a conversation member');
    await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: new Date() } });
    return { ok: true };
  });

  app.get('/api/search/universal', protectedRoute, async (request: any) => {
    const userId = uid(request);
    const q = String(request.query?.q || '').trim();
    const type = String(request.query?.type || 'all').toLowerCase();
    const limit = Math.min(Math.max(Number(request.query?.limit || 25), 1), 50);
    if (q.length < 2) return { people: [], chats: [], messages: [], files: [], photos: [], links: [], groups: [] };
    const memberships = await prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true } });
    const allowed = memberships.map(m => m.conversationId);
    const wants = (name: string) => type === 'all' || type === name;
    const result: any = { people: [], chats: [], messages: [], files: [], photos: [], links: [], groups: [] };

    if (wants('people')) result.people = await prisma.user.findMany({ where: { id: { not: userId }, OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }, select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeenAt: true }, take: limit });
    if (allowed.length && (wants('chats') || wants('groups'))) {
      const conversations = await prisma.conversation.findMany({ where: { id: { in: allowed }, OR: [{ title: { contains: q, mode: 'insensitive' } }, { members: { some: { user: { displayName: { contains: q, mode: 'insensitive' } } } } }] }, include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } }, take: limit });
      result.chats = wants('chats') ? conversations.filter(c => !c.isGroup) : [];
      result.groups = wants('groups') ? conversations.filter(c => c.isGroup) : [];
    }
    if (allowed.length && (wants('messages') || wants('files') || wants('photos') || wants('links'))) {
      const messages = await prisma.message.findMany({ where: { conversationId: { in: allowed }, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], body: { contains: q, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, conversationId: true, senderId: true, body: true, type: true, createdAt: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
      result.messages = wants('messages') ? messages : [];
      result.files = wants('files') ? messages.filter(m => ['file','document','attachment'].includes(String(m.type || '').toLowerCase())) : [];
      result.photos = wants('photos') ? messages.filter(m => ['image','photo'].includes(String(m.type || '').toLowerCase())) : [];
      result.links = wants('links') ? messages.filter(m => /https?:\/\//i.test(String(m.body))) : [];
    }
    return result;
  });
}
