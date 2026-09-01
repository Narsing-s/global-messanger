import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from './smtp.js';

type AuthRequest = { user: { id: string; username: string } };
type IdParams = { id: string };
type MessageSearchQuery = { q?: string; conversationId?: string; limit?: string };
type ForwardBody = { conversationId: string };
type MuteBody = { minutes?: number | null };

const idSchema = z.string().min(1).max(128);

const hashResetToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export async function registerAdvancedRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const auth = { preHandler: [app.authenticate] };

  /* ------------------------------------------------------------------------ */
  /* Password recovery                                                        */
  /* ------------------------------------------------------------------------ */

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const parsed = z.object({
      email: z.string().trim().email().max(320)
    }).safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.badRequest('A valid email address is required');
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        ok: true,
        message: 'If an account exists for that email, a password reset link has been sent.'
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const webOrigin = (process.env.PASSWORD_RESET_WEB_ORIGIN || process.env.WEB_ORIGIN || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    const resetUrl = `${webOrigin}/?resetToken=${encodeURIComponent(token)}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt
      }
    });

    try {
      await sendPasswordResetEmail(email, user.displayName || user.username || 'there', resetUrl);
    } catch (error) {
      app.log.error(error, 'Password reset email failed');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: null,
          resetTokenExpiresAt: null
        }
      });
      return reply.serviceUnavailable('Password reset email could not be sent. Please try again later.');
    }

    return {
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.'
    };
  });

  app.post('/api/auth/reset-password', async (request, reply) => {
    const parsed = z.object({
      token: z.string().min(32).max(128),
      password: z.string().min(8).max(128)
    }).safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.badRequest('A valid reset token and password of at least 8 characters are required');
    }

    const tokenHash = hashResetToken(parsed.data.token);
    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      return reply.badRequest('This password reset link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        lastSeenAt: new Date()
      }
    });

    return {
      ok: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    };
  });

  async function getMessageAccess(request: FastifyRequestWithId, reply: any) {
    const userId = (request.user as AuthRequest['user']).id;
    const messageId = String(request.params.id);
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) { reply.notFound('Message not found'); return null; }
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: message.conversationId, userId } } });
    if (!membership) { reply.forbidden('Not a conversation member'); return null; }
    return { userId, message };
  }

  app.get<{ Querystring: MessageSearchQuery }>('/api/messages/search', auth, async (request) => {
    const userId = (request.user as AuthRequest['user']).id;
    const q = String(request.query.q ?? '').trim();
    const conversationId = String(request.query.conversationId ?? '').trim();
    const limit = Math.min(Math.max(Number(request.query.limit ?? 50), 1), 100);
    if (q.length < 2) return [];
    const memberships = await prisma.conversationMember.findMany({ where: { userId, ...(conversationId ? { conversationId } : {}) }, select: { conversationId: true } });
    const allowed = memberships.map(x => x.conversationId);
    if (!allowed.length) return [];
    return prisma.message.findMany({ where: { conversationId: { in: allowed }, deletedAt: null, body: { contains: q, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, take: limit, include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
  });

  app.post('/api/ai/assist', auth, async (request, reply) => {
    const parsed = z.object({ prompt: z.string().trim().min(1).max(4000), context: z.string().trim().max(6000).optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('prompt is required and must be 1-4000 characters');
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return reply.serviceUnavailable('AI is not configured. Add GROQ_API_KEY to the server environment.');
    const isGroq = Boolean(process.env.GROQ_API_KEY);
    const endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
    const context = parsed.data.context ? `\nConversation context:\n${parsed.data.context}` : '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.4, max_tokens: 700, messages: [
          { role: 'system', content: 'You are Global Messenger AI. Be concise, helpful, friendly, and privacy-conscious. Never claim to have performed actions you cannot perform.' },
          { role: 'user', content: `${parsed.data.prompt}${context}` }
        ] })
      });
      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) return reply.code(502).send({ message: data?.error?.message || 'AI provider request failed' });
      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) return reply.code(502).send({ message: 'AI returned an empty response' });
      return { answer: answer.trim(), model };
    } catch {
      return reply.code(502).send({ message: 'Unable to reach AI provider' });
    }
  });

  app.post<{ Params: IdParams }>('/api/messages/:id/bookmark', auth, async (request, reply) => {
    const access = await getMessageAccess(request, reply); if (!access) return;
    return prisma.messageBookmark.upsert({ where: { messageId_userId: { messageId: access.message.id, userId: access.userId } }, create: { messageId: access.message.id, userId: access.userId }, update: {} });
  });

  app.delete<{ Params: IdParams }>('/api/messages/:id/bookmark', auth, async (request, reply) => {
    const access = await getMessageAccess(request, reply); if (!access) return;
    await prisma.messageBookmark.deleteMany({ where: { messageId: access.message.id, userId: access.userId } }); return { ok: true };
  });

  app.get('/api/bookmarks', auth, async request => {
    const userId = (request.user as AuthRequest['user']).id;
    return prisma.messageBookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200, include: { message: { include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } } });
  });

  app.post<{ Params: IdParams }>('/api/messages/:id/pin', auth, async (request, reply) => {
    const access = await getMessageAccess(request, reply); if (!access) return;
    if (access.message.deletedAt) return reply.badRequest('Deleted messages cannot be pinned');
    return prisma.pinnedMessage.upsert({ where: { conversationId_messageId: { conversationId: access.message.conversationId, messageId: access.message.id } }, create: { conversationId: access.message.conversationId, messageId: access.message.id, pinnedById: access.userId }, update: { pinnedById: access.userId } });
  });

  app.delete<{ Params: IdParams }>('/api/messages/:id/pin', auth, async (request, reply) => {
    const access = await getMessageAccess(request, reply); if (!access) return;
    await prisma.pinnedMessage.deleteMany({ where: { conversationId: access.message.conversationId, messageId: access.message.id } }); return { ok: true };
  });

  app.get<{ Params: IdParams }>('/api/conversations/:id/pins', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return reply.forbidden('Not a conversation member');
    return prisma.pinnedMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, include: { message: { include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } } });
  });

  app.post<{ Params: IdParams; Body: ForwardBody }>('/api/messages/:id/forward', auth, async (request, reply) => {
    const access = await getMessageAccess(request, reply); if (!access) return;
    const parsed = z.object({ conversationId: idSchema }).safeParse(request.body);
    if (!parsed.success) return reply.badRequest('conversationId is required');
    const target = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: parsed.data.conversationId, userId: access.userId } } });
    if (!target) return reply.forbidden('You are not a member of the target conversation');
    const copy = await prisma.message.create({ data: { conversationId: parsed.data.conversationId, senderId: access.userId, body: access.message.body, type: access.message.type === 'text' ? 'forwarded' : access.message.type, attachmentUrl: access.message.attachmentUrl, attachmentName: access.message.attachmentName, attachmentMime: access.message.attachmentMime, attachmentSize: access.message.attachmentSize } });
    await prisma.conversation.update({ where: { id: parsed.data.conversationId }, data: { updatedAt: new Date() } }); return copy;
  });

  app.post<{ Params: IdParams; Body: MuteBody }>('/api/conversations/:id/mute', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const parsed = z.object({ minutes: z.number().int().min(0).max(525600).nullable().optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('minutes must be between 0 and 525600');
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return reply.forbidden('Not a conversation member');
    const minutes = parsed.data.minutes ?? 0; const mutedUntil = minutes > 0 ? new Date(Date.now() + minutes * 60000) : null;
    return prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { mutedUntil } });
  });

  app.post<{ Params: IdParams }>('/api/users/:id/block', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id; const blockedUserId = request.params.id;
    if (userId === blockedUserId) return reply.badRequest('You cannot block yourself');
    const target = await prisma.user.findUnique({ where: { id: blockedUserId }, select: { id: true } });
    if (!target) return reply.notFound('User not found');
    return prisma.userBlock.upsert({ where: { userId_blockedUserId: { userId, blockedUserId } }, create: { userId, blockedUserId }, update: {} });
  });

  app.delete<{ Params: IdParams }>('/api/users/:id/block', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id; await prisma.userBlock.deleteMany({ where: { userId, blockedUserId: request.params.id } }); return { ok: true };
  });

  app.get('/api/users/blocked', auth, async request => {
    const userId = (request.user as AuthRequest['user']).id;
    return prisma.userBlock.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { blockedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
  });
}

type FastifyRequestWithId = import('fastify').FastifyRequest<{ Params: IdParams }>;
