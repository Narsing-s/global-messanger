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
}
