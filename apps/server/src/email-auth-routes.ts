import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail, sendReportEmail } from './smtp.js';

const emailSchema = z.string().trim().email().max(320);
const auth = { preHandler: [] as any[] };

export async function registerEmailAuthRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/auth/register-email', async (request, reply) => {
    const parsed = z.object({
      username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/),
      displayName: z.string().trim().min(1).max(60),
      email: emailSchema,
      password: z.string().min(8).max(128)
    }).safeParse(request.body ?? {});

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path?.[0];
      const message = field === 'username'
        ? 'Username must be 3-24 characters using letters, numbers, underscore, dot or hyphen.'
        : field === 'displayName'
          ? 'Display name is required and must be 1-60 characters.'
          : field === 'email'
            ? 'Please enter a valid email address.'
            : field === 'password'
              ? 'Password must be 8-128 characters.'
              : 'Please check all registration fields.';
      return reply.badRequest(message);
    }

    const username = parsed.data.username.toLowerCase();
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true }
    });

    if (existing?.username === username) return reply.conflict('Username is already taken');
    if (existing?.email === email) return reply.conflict('Email is already registered');

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: { username, displayName: parsed.data.displayName, email, passwordHash }
    });

    try {
      await sendWelcomeEmail(email, user.displayName || user.username || 'there');
    } catch (error) {
      app.log.error(error, 'Welcome email failed');
      const message = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'Unable to send the welcome email.';
      return reply.code(503).send({
        message: `Account was created, but the welcome email could not be sent: ${message}`
      });
    }

    const token = app.jwt.sign({ id: user.id, username: user.username });
    return reply.code(201).send({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
    });
  });

  app.post('/api/auth/login-email', async (request, reply) => {
    const parsed = z.object({ identifier: z.string().trim().min(1).max(320), password: z.string().min(1).max(128) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Email/username and password are required.');

    const identifier = parsed.data.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return reply.unauthorized('Invalid email/username or password');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const token = app.jwt.sign({ id: user.id, username: user.username });
    return {
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
    };
  });

  app.delete('/api/conversations/:id/permanent', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = String((request.user as any).id);
    const conversationId = String((request.params as any).id);
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return reply.notFound('Chat not found.');
    await prisma.conversation.delete({ where: { id: conversationId } });
    return { ok: true, conversationId };
  });

  app.post('/api/conversations/:id/clear', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = String((request.user as any).id);
    const conversationId = String((request.params as any).id);
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return reply.notFound('Chat not found.');
    await prisma.message.deleteMany({ where: { conversationId } });
    return { ok: true, conversationId };
  });

  app.post('/api/conversations/:id/report', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = String((request.user as any).id);
    const conversationId = String((request.params as any).id);
    const parsed = z.object({ reason: z.string().trim().min(1).max(100), details: z.string().trim().max(2000).optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Choose a report reason.');
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return reply.notFound('Chat not found.');
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, displayName: true, username: true } });
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: { include: { user: { select: { id: true, displayName: true, username: true } } } } } });
    const reported = conversation?.members.find(m => m.userId !== userId)?.user;
    await sendReportEmail({ reporterEmail: me?.email || undefined, reporterName: me?.displayName || me?.username, reportedName: reported?.displayName || reported?.username, conversationId, reason: parsed.data.reason, details: parsed.data.details });
    return { ok: true, message: 'Report submitted to Global Messenger support.' };
  });
}
