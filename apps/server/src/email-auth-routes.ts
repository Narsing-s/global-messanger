import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from './smtp.js';

const emailSchema = z.string().trim().email().max(320);

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
      // Welcome email is non-blocking: account creation must still succeed if SMTP is unavailable.
      app.log.error(error, 'Welcome email failed');
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
}
