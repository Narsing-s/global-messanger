import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

function uid(request: any): string {
  return String((request.user as { id: string }).id);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function bearerToken(request: any): string | null {
  const value = String(request.headers?.authorization ?? '');
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  const token = value.slice(7).trim();
  return token || null;
}

export async function registerSessionSecurity(app: FastifyInstance, prisma: PrismaClient) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/api/security/sessions', auth, async request => {
    const userId = uid(request);
    return prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true
      },
      orderBy: { lastSeenAt: 'desc' }
    });
  });

  app.delete('/api/security/sessions/:id', auth, async (request, reply) => {
    const userId = uid(request);
    const sessionId = String((request.params as any).id);
    const currentToken = bearerToken(request);
    const currentHash = currentToken ? hashToken(currentToken) : null;
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
      select: { id: true, tokenHash: true }
    });
    if (!session) return reply.notFound('Session not found');
    if (currentHash && session.tokenHash === currentHash) {
      return reply.badRequest('The current session cannot be revoked. Use logout instead.');
    }
    await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return { ok: true, sessionId };
  });

  app.post('/api/security/sessions/revoke-others', auth, async request => {
    const userId = uid(request);
    const token = bearerToken(request);
    const currentHash = token ? hashToken(token) : null;
    const result = await prisma.userSession.updateMany({
      where: { userId, revokedAt: null, ...(currentHash ? { tokenHash: { not: currentHash } } : {}) },
      data: { revokedAt: new Date() }
    });
    return { ok: true, revoked: result.count };
  });

  app.post('/api/auth/logout', auth, async request => {
    const token = bearerToken(request);
    if (token) {
      await prisma.userSession.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    return { ok: true };
  });
}
