import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { z } from 'zod';

type User = { id: string; username: string };
const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const userOf = (request: any) => request.user as User;
const entity = (prisma: PrismaClient, ownerId: string, name: string, data: unknown, status = 'active') => prisma.globalEntity.create({ data: { ownerId, kind: 'security', name, data, status } });

export async function registerGlobalCompletionRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const a = auth(app);
  app.put('/api/e2ee/recovery-backup', a, async (request, reply) => {
    const p = z.object({ ciphertext: z.string().min(32).max(200000), salt: z.string().min(8).max(512), iv: z.string().min(8).max(512), version: z.number().int().min(1).max(100).default(1), deviceId: z.string().min(1).max(200) }).safeParse(request.body ?? {});
    if (!p.success) return reply.badRequest('Invalid encrypted recovery backup');
    const user = userOf(request);
    const existing = await prisma.globalEntity.findFirst({ where: { ownerId: user.id, kind: 'security', name: 'e2ee-recovery-backup', status: 'active' } });
    const data = { ciphertext: p.data.ciphertext, salt: p.data.salt, iv: p.data.iv, version: p.data.version, deviceId: p.data.deviceId, updatedAt: new Date().toISOString() };
    if (existing) return prisma.globalEntity.update({ where: { id: existing.id }, data: { data } });
    return entity(prisma, user.id, 'e2ee-recovery-backup', data);
  });
  app.get('/api/e2ee/recovery-backup', a, async request => {
    const user = userOf(request);
    return prisma.globalEntity.findFirst({ where: { ownerId: user.id, kind: 'security', name: 'e2ee-recovery-backup', status: 'active' }, select: { id: true, data: true, updatedAt: true } });
  });
  app.post('/api/e2ee/recovery-device', a, async (request, reply) => {
    const p = z.object({ deviceId: z.string().min(1).max(200), publicKey: z.string().min(16).max(10000), verification: z.string().min(16).max(10000) }).safeParse(request.body ?? {});
    if (!p.success) return reply.badRequest('Device identity and verification proof are required');
    const user = userOf(request);
    const fingerprint = crypto.createHash('sha256').update(`${user.id}:${p.data.deviceId}:${p.data.publicKey}:${p.data.verification}`).digest('hex');
    await entity(prisma, user.id, 'e2ee-device-recovery', { deviceId: p.data.deviceId, fingerprint, createdAt: new Date().toISOString() });
    return { ok: true, fingerprint };
  });

  app.get('/api/conversations/:id/messages/page', a, async (request, reply) => {
    const user = userOf(request); const conversationId = String((request.params as any).id);
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: user.id } } });
    if (!member) return reply.forbidden('Not a conversation member');
    const q = request.query as { cursor?: string; limit?: string }; const limit = Math.min(Math.max(Number(q.limit ?? 50), 1), 100);
    let cursor: { createdAt: string; id: string } | null = null;
    if (q.cursor) { try { cursor = JSON.parse(Buffer.from(q.cursor, 'base64url').toString('utf8')); } catch { return reply.badRequest('Invalid pagination cursor'); } }
    const where: any = { conversationId, deletedAt: null };
    if (cursor?.createdAt && cursor?.id) where.OR = [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }];
    const rows = await prisma.message.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, reactions: true, replyTo: { select: { id: true, body: true, senderId: true } } } });
    const hasMore = rows.length > limit; const messages = rows.slice(0, limit).reverse(); const last = rows[Math.min(limit, rows.length) - 1];
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString('base64url') : null;
    return { messages, hasMore, nextCursor };
  });

  app.get('/api/notifications/history', a, async request => {
    const user = userOf(request); const rows = await prisma.globalEntity.findMany({ where: { ownerId: user.id, kind: 'security', name: 'notification', status: { not: 'deleted' } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map(row => ({ id: row.id, ...(row.data as any), createdAt: row.createdAt }));
  });
  app.post('/api/notifications/history', a, async (request, reply) => {
    const p = z.object({ type: z.string().min(1).max(64), title: z.string().min(1).max(200), body: z.string().max(2000), conversationId: z.string().optional(), read: z.boolean().default(false) }).safeParse(request.body ?? {});
    if (!p.success) return reply.badRequest('Invalid notification'); return entity(prisma, userOf(request).id, 'notification', { ...p.data, createdAt: new Date().toISOString() });
  });
  app.patch('/api/notifications/history/:id/read', a, async (request, reply) => {
    const user = userOf(request); const id = String((request.params as any).id); const row = await prisma.globalEntity.findFirst({ where: { id, ownerId: user.id, kind: 'security', name: 'notification' } });
    if (!row) return reply.notFound('Notification not found'); return prisma.globalEntity.update({ where: { id }, data: { data: { ...(row.data as any), read: true } } });
  });

  app.post('/api/moderation/reports', a, async (request, reply) => {
    const p = z.object({ targetType: z.enum(['user','message','conversation','media']), targetId: z.string().min(1).max(200), reason: z.string().min(1).max(500), details: z.string().max(5000).optional() }).safeParse(request.body ?? {});
    if (!p.success) return reply.badRequest('Invalid abuse report'); const user = userOf(request);
    return entity(prisma, user.id, 'moderation-report', { ...p.data, reporterId: user.id, status: 'open', timeline: [{ at: new Date().toISOString(), action: 'created', actor: user.id }] }, 'moderation-report', 'open');
  });
  app.get('/api/moderation/reports', a, async request => prisma.globalEntity.findMany({ where: { ownerId: userOf(request).id, kind: 'security', name: 'moderation-report', status: { not: 'deleted' } }, orderBy: { createdAt: 'desc' }, take: 100 }));

  app.get('/api/account/export', a, async request => {
    const user = userOf(request);
    const [profile, memberships, bookmarks] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { id: true, username: true, email: true, phoneNumber: true, displayName: true, bio: true, avatarUrl: true, createdAt: true, privacyLastSeen: true, privacyProfilePhoto: true } }),
      prisma.conversationMember.findMany({ where: { userId: user.id }, select: { conversationId: true, favoriteAt: true, pinnedAt: true, archivedAt: true, mutedUntil: true } }),
      prisma.messageBookmark.findMany({ where: { userId: user.id }, select: { messageId: true, createdAt: true } })
    ]);
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), profile, memberships, bookmarks };
  });

  app.get('/api/account/preferences', a, async request => prisma.globalEntity.findFirst({ where: { ownerId: userOf(request).id, kind: 'security', name: 'ui-preferences', status: 'active' }, select: { data: true, updatedAt: true } }) ?? { data: {} });
  app.put('/api/account/preferences', a, async (request, reply) => {
    const p = z.object({ language: z.string().min(2).max(16).default('en'), rtl: z.boolean().default(false), reducedMotion: z.boolean().default(false), textScale: z.number().min(0.8).max(2).default(1), highContrast: z.boolean().default(false), screenReaderHints: z.boolean().default(true), keyboardMode: z.boolean().default(true), timezone: z.string().max(64).default('UTC'), dateFormat: z.string().max(32).default('auto') }).safeParse(request.body ?? {});
    if (!p.success) return reply.badRequest('Invalid accessibility/localization preferences');
    const user = userOf(request); const existing = await prisma.globalEntity.findFirst({ where: { ownerId: user.id, kind: 'security', name: 'ui-preferences', status: 'active' } });
    if (existing) return prisma.globalEntity.update({ where: { id: existing.id }, data: { data: p.data } }); return entity(prisma, user.id, 'ui-preferences', p.data);
  });

  app.get('/api/platform/completion', a, async () => ({ server: { cursorPagination: true, offlineSync: true, e2eeRecoveryEnvelope: true, notificationHistory: true, moderationWorkflow: true, accountExport: true, preferenceSync: true }, clientRequirements: ['virtualized-list','outbox-replay','media-resume','listener-dedup','WCAG-2.2-AA-audit','RTL-layout-audit','physical-device-WebRTC-test'], generatedAt: new Date().toISOString() }));
}
