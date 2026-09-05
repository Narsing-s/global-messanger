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

export async function registerSupportRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/support/requests', async (request, reply) => {
    const parsed = supportSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Please provide a valid name, email, category, subject and issue details.');

    const data = parsed.data;
    let requestId = makeRequestId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.supportRequest.findUnique({ where: { requestId } });
      if (!exists) break;
      requestId = makeRequestId();
    }

    const created = await prisma.supportRequest.create({ data: { requestId, ...data } });
    let notification: 'sent' | 'failed' = 'sent';
    try {
      await sendSupportRequestEmail(created);
    } catch (error) {
      notification = 'failed';
      app.log.error(error, 'Support request notification email failed');
    }

    return reply.code(201).send({
      ok: true,
      requestId: created.requestId,
      status: created.status,
      createdAt: created.createdAt,
      notification,
      message: notification === 'sent'
        ? `Support request ${created.requestId} was submitted successfully.`
        : `Support request ${created.requestId} was saved successfully, but the support notification email could not be delivered right now.`,
    });
  });

  app.get<{ Params: { requestId: string } }>('/api/support/requests/:requestId', async (request, reply) => {
    const requestId = String(request.params.requestId || '').trim().toUpperCase();
    if (!/^GM-[0-9]{8}-[A-F0-9]{8}$/.test(requestId)) return reply.badRequest('Invalid support request ID.');
    const item = await prisma.supportRequest.findUnique({ where: { requestId }, select: { requestId: true, category: true, subject: true, status: true, createdAt: true, updatedAt: true } });
    if (!item) return reply.notFound('Support request not found.');
    return { ok: true, ...item };
  });
}
