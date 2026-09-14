import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { sendSupportRequestEmail } from './smtp.js';

const supportSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  category: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(3).max(180),
  details: z.string().trim().min(10).max(10000),
});
const makeRequestId = () => `GM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const secured = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });

export async function registerSupportRoutes(app: FastifyInstance, prisma: PrismaClient) {
  if (!app.hasRoute({ method: 'OPTIONS', url: '/api/support/requests' })) {
    app.options('/api/support/requests', async (request, reply) => {
      const origin = String(request.headers.origin || '');
      const allowed = origin === 'https://global-messenger-help-centre.onrender.com';
      if (allowed) reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-methods', 'POST, OPTIONS').header('access-control-allow-headers', 'content-type, authorization').header('access-control-max-age', '86400');
      return reply.code(204).send();
    });
  }
  if (!app.hasRoute({ method: 'POST', url: '/api/support/requests' })) {
    app.post('/api/support/requests', async (request, reply) => {
      const parsed = supportSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.badRequest('Please provide a valid name, email, category, subject and issue details.');
      const data = parsed.data; let requestId = makeRequestId();
      for (let attempt = 0; attempt < 5; attempt++) { const exists = await prisma.supportRequest.findUnique({ where: { requestId } }); if (!exists) break; requestId = makeRequestId(); }
      const created = await prisma.supportRequest.create({ data: { requestId, ...data } });
      let notification: 'sent' | 'failed' = 'sent';
      try { await sendSupportRequestEmail(created); } catch (error) { notification = 'failed'; app.log.error(error, 'Support request notification email failed'); }
      return reply.code(201).send({ ok: true, requestId: created.requestId, status: created.status, createdAt: created.createdAt, notification, message: notification === 'sent' ? `Support request ${created.requestId} was submitted successfully.` : `Support request ${created.requestId} was saved successfully, but the support notification email could not be delivered right now.` });
    });
  }
  if (!app.hasRoute({ method: 'GET', url: '/api/support/requests/:requestId' })) {
    app.get<{ Params: { requestId: string } }>('/api/support/requests/:requestId', async (request, reply) => {
      const requestId = String(request.params.requestId || '').trim().toUpperCase();
      if (!/^GM-[0-9]{8}-[A-F0-9]{8}$/.test(requestId)) return reply.badRequest('Invalid support request ID.');
      const item = await prisma.supportRequest.findUnique({ where: { requestId }, select: { requestId: true, category: true, subject: true, status: true, createdAt: true, updatedAt: true } });
      if (!item) return reply.notFound('Support request not found.');
      return { ok: true, ...item };
    });
  }

  // Authenticated Trust & Safety operations used by the Operations Center.
  if (!app.hasRoute({ method: 'POST', url: '/api/trust/reports' })) {
    app.post('/api/trust/reports', secured(app), async (request, reply) => {
      const userId = String((request.user as { id: string }).id);
      const parsed = z.object({ targetId: z.string().trim().min(1).max(200), reason: z.string().trim().min(3).max(80).default('abuse'), details: z.string().trim().max(4000).optional() }).safeParse(request.body ?? {});
      if (!parsed.success) return reply.badRequest('A target ID and report reason are required.');
      const reporter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true } });
      if (!reporter) return reply.notFound('Reporter not found.');
      let requestId = makeRequestId();
      for (let attempt = 0; attempt < 5; attempt++) { const exists = await prisma.supportRequest.findUnique({ where: { requestId } }); if (!exists) break; requestId = makeRequestId(); }
      const created = await prisma.supportRequest.create({ data: { requestId, name: reporter.displayName || 'Global Messenger user', email: reporter.email || 'no-reply@global-messenger.local', category: 'trust-safety', subject: `Abuse report: ${parsed.data.reason}`, details: `Reporter: ${userId}\nTarget: ${parsed.data.targetId}\nReason: ${parsed.data.reason}\n${parsed.data.details || ''}` } });
      return reply.code(201).send({ ok: true, reportId: created.requestId, status: created.status, createdAt: created.createdAt });
    });
  }
  if (!app.hasRoute({ method: 'GET', url: '/api/trust/status' })) {
    app.get('/api/trust/status', secured(app), async request => {
      const userId = String((request.user as { id: string }).id);
      const [blocked, reports] = await Promise.all([prisma.userBlock.count({ where: { userId } }), prisma.supportRequest.count({ where: { email: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email || '', category: 'trust-safety' } })]);
      return { ok: true, abuseProtection: 'enabled', rateLimiting: 'enabled', blockedUsers: blocked, reportsSubmitted: reports };
    });
  }
}
