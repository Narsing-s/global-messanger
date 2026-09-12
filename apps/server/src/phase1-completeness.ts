import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type AuthUser = { id: string; username: string };
type IdParams = { id: string };

const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });

export async function registerPhase1Routes(app: FastifyInstance, prisma: PrismaClient) {
  const secured = auth(app);

  app.get('/api/profile/me', secured, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, phoneNumber: true, displayName: true, bio: true, avatarUrl: true, lastSeenAt: true, privacyLastSeen: true, privacyProfilePhoto: true, e2eeKeyVersion: true, createdAt: true }
    });
    if (!user) return reply.notFound('Profile not found');
    return user;
  });

  app.patch('/api/profile/me', secured, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = z.object({
      displayName: z.string().trim().min(1).max(80).optional(),
      username: z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,32}$/).optional(),
      bio: z.string().trim().max(280).optional(),
      avatarUrl: z.string().trim().url().max(2048).nullable().optional()
    }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid profile data');
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: parsed.data,
        select: { id: true, username: true, email: true, phoneNumber: true, displayName: true, bio: true, avatarUrl: true, lastSeenAt: true, privacyLastSeen: true, privacyProfilePhoto: true, e2eeKeyVersion: true, createdAt: true }
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return reply.conflict('That username is already in use.');
      throw error;
    }
  });

  app.get('/api/conversations/preferences', secured, async request => {
    const userId = (request.user as AuthUser).id;
    return prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true, archivedAt: true, mutedUntil: true, favoriteAt: true, pinnedAt: true } });
  });

  app.patch<{ Params: IdParams }>('/api/conversations/:id/preferences', secured, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const conversationId = request.params.id;
    const parsed = z.object({ archived: z.boolean().optional(), favorite: z.boolean().optional(), pinned: z.boolean().optional(), mutedUntil: z.string().datetime().nullable().optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid conversation preference');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.notFound('Conversation not found');
    const data: any = {};
    if (parsed.data.archived !== undefined) data.archivedAt = parsed.data.archived ? new Date() : null;
    if (parsed.data.favorite !== undefined) data.favoriteAt = parsed.data.favorite ? new Date() : null;
    if (parsed.data.pinned !== undefined) data.pinnedAt = parsed.data.pinned ? new Date() : null;
    if (parsed.data.mutedUntil !== undefined) data.mutedUntil = parsed.data.mutedUntil ? new Date(parsed.data.mutedUntil) : null;
    return prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data, select: { conversationId: true, archivedAt: true, mutedUntil: true, favoriteAt: true, pinnedAt: true } });
  });

  app.get('/api/messages/saved', secured, async request => {
    const userId = (request.user as AuthUser).id;
    const limit = Math.min(Math.max(Number((request.query as any)?.limit ?? 100), 1), 200);
    return prisma.messageBookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit, include: { message: { include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, conversation: { select: { id: true, title: true, isGroup: true } } } } } });
  });

  app.get<{ Params: IdParams }>('/api/messages/:id/info', secured, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const message = await prisma.message.findUnique({ where: { id: request.params.id }, include: { sender: { select: { id: true, username: true, displayName: true } }, receipts: { include: { user: { select: { id: true, username: true, displayName: true } } } }, reactions: true, bookmarks: { select: { userId: true, createdAt: true } }, pin: true } });
    if (!message) return reply.notFound('Message not found');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: message.conversationId, userId } } });
    if (!member) return reply.forbidden('Not a conversation member');
    return message;
  });

  app.post('/api/messages/bulk-delete', secured, async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = z.object({ messageIds: z.array(z.string().min(1)).min(1).max(100) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('messageIds is required');
    const messages = await prisma.message.findMany({ where: { id: { in: parsed.data.messageIds }, senderId: userId }, select: { id: true } });
    const ids = messages.map(m => m.id);
    if (!ids.length) return { ok: true, deleted: 0 };
    await prisma.message.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), body: '' } });
    return { ok: true, deleted: ids.length, messageIds: ids };
  });

  app.get('/api/blocks', secured, async request => {
    const userId = (request.user as AuthUser).id;
    return prisma.userBlock.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { blockedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
  });

  app.post('/api/blocks/:userId', secured, async (request: any, reply) => {
    const userId = (request.user as AuthUser).id;
    const blockedUserId = String(request.params.userId);
    if (blockedUserId === userId) return reply.badRequest('You cannot block yourself');
    const target = await prisma.user.findUnique({ where: { id: blockedUserId }, select: { id: true } });
    if (!target) return reply.notFound('User not found');
    await prisma.userBlock.upsert({ where: { userId_blockedUserId: { userId, blockedUserId } }, create: { userId, blockedUserId }, update: {} });
    return { ok: true };
  });

  app.delete('/api/blocks/:userId', secured, async (request: any) => {
    const userId = (request.user as AuthUser).id;
    await prisma.userBlock.deleteMany({ where: { userId, blockedUserId: String(request.params.userId) } });
    return { ok: true };
  });
}
