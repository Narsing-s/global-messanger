import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { z } from 'zod';

type Req = any;
const uid = (request: Req) => String(request.user?.id || '');
const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const kinds = ['story','community','channel','topic','event','bot','mini_app','webhook','business','catalog','moderation_case','call_room'] as const;
type Kind = typeof kinds[number];

const createSchema = z.object({
  kind: z.enum(kinds),
  title: z.string().trim().max(200).optional(),
  payload: z.record(z.any()).default({}),
  status: z.string().trim().max(40).default('ACTIVE')
});

async function ensureTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS global_platform_entities (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      title TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS global_platform_entities_owner_kind ON global_platform_entities(owner_id, kind, updated_at DESC)`);
}

export async function registerGlobalMarketPlatform(app: FastifyInstance, prisma: PrismaClient) {
  const protectedRoute = auth(app);
  try { await ensureTable(prisma); } catch (error) { app.log.error(error, 'global platform table initialization failed'); }

  // One persistent entity store prevents the P1-P5 feature centers from creating
  // separate incompatible storage implementations. Domain-specific validation lives
  // in payload schemas while ownership and access are enforced here.
  app.get('/api/global/features', async () => ({
    version: '2026.09',
    p0: ['offline-outbox','retry-idempotency','reconnect','forward','message-info','bulk-actions','profile-center','chat-info','e2ee-device-recovery'],
    p1: ['stories','communities','channels','topics','polls','scheduled-messages','events','live-location','voice-transcription'],
    p2: ['group-calls','webrtc-signaling','turn-configuration','adaptive-bitrate','network-quality','call-reconnect','screen-share','noise-suppression','echo-cancellation','call-analytics'],
    p3: ['bots','mini-apps','developer-api','webhooks','developer-dashboard','api-keys','business-accounts','business-inbox','catalogs','support-automation'],
    p4: ['rewrite','translation','conversation-summary','unread-summary','voice-transcription','smart-replies','natural-language-search','file-understanding','call-summary','e2ee-ai-boundary'],
    p5: ['accessibility','rtl','internationalization','regional-formatting','media-acceleration','multi-region','disaster-recovery','abuse-prevention','spam-protection','account-takeover-detection','security-incidents','privacy-controls']
  }));

  app.post('/api/global/entities', protectedRoute, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.badRequest(parsed.error.issues.map(x => x.message).join('; '));
    const id = crypto.randomUUID();
    const b = parsed.data;
    await prisma.$executeRaw`
      INSERT INTO global_platform_entities (id, kind, owner_id, title, payload, status)
      VALUES (${id}, ${b.kind}, ${uid(request)}, ${b.title || null}, ${JSON.stringify(b.payload)}::jsonb, ${b.status})
    `;
    return reply.code(201).send({ id, kind: b.kind, ownerId: uid(request), title: b.title || null, payload: b.payload, status: b.status });
  });

  app.get('/api/global/entities', protectedRoute, async (request: any) => {
    const kind = String(request.query?.kind || '').trim();
    const rows = kind && (kinds as readonly string[]).includes(kind)
      ? await prisma.$queryRaw`SELECT id, kind, title, payload, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM global_platform_entities WHERE owner_id=${uid(request)} AND kind=${kind} ORDER BY updated_at DESC LIMIT 200`
      : await prisma.$queryRaw`SELECT id, kind, title, payload, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM global_platform_entities WHERE owner_id=${uid(request)} ORDER BY updated_at DESC LIMIT 200`;
    return rows;
  });

  app.get('/api/global/entities/:id', protectedRoute, async (request: any, reply) => {
    const rows: any[] = await prisma.$queryRaw`SELECT id, kind, title, payload, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM global_platform_entities WHERE id=${String(request.params.id)} AND owner_id=${uid(request)} LIMIT 1`;
    if (!rows[0]) return reply.notFound('Feature entity not found');
    return rows[0];
  });

  app.patch('/api/global/entities/:id', protectedRoute, async (request: any, reply) => {
    const id = String(request.params.id);
    const body = request.body || {};
    const title = body.title === undefined ? null : String(body.title).trim().slice(0, 200);
    const status = body.status === undefined ? null : String(body.status).trim().slice(0, 40);
    const payload = body.payload === undefined ? null : JSON.stringify(body.payload);
    const result: any = await prisma.$queryRaw`
      UPDATE global_platform_entities
      SET title=COALESCE(${title}, title), status=COALESCE(${status}, status), payload=COALESCE(${payload}::jsonb, payload), updated_at=NOW()
      WHERE id=${id} AND owner_id=${uid(request)}
      RETURNING id, kind, title, payload, status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    if (!result[0]) return reply.notFound('Feature entity not found');
    return result[0];
  });

  app.delete('/api/global/entities/:id', protectedRoute, async (request: any, reply) => {
    const result = await prisma.$executeRaw`DELETE FROM global_platform_entities WHERE id=${String(request.params.id)} AND owner_id=${uid(request)}`;
    if (!result) return reply.notFound('Feature entity not found');
    return { ok: true };
  });

  // Developer API surface: API keys are represented as opaque hashes, never returned
  // after creation. This is a foundation for the dashboard and webhook ecosystem.
  app.post('/api/developer/keys', protectedRoute, async (request: any, reply) => {
    const label = String(request.body?.label || 'API key').trim().slice(0, 80) || 'API key';
    const secret = `gm_${crypto.randomBytes(32).toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    const id = crypto.randomUUID();
    await prisma.$executeRaw`INSERT INTO global_platform_entities (id, kind, owner_id, title, payload) VALUES (${id}, 'webhook', ${uid(request)}, ${label}, ${JSON.stringify({ keyHash: hash, scopes: Array.isArray(request.body?.scopes) ? request.body.scopes : ['messages:read','messages:write'], lastUsedAt: null })}::jsonb)`;
    return reply.code(201).send({ id, label, apiKey: secret, warning: 'Store this key now. It is not returned again.' });
  });

  // Webhook delivery is intentionally opt-in and records only endpoint metadata.
  // Actual delivery workers can consume these records without changing the API contract.
  app.post('/api/developer/webhooks', protectedRoute, async (request, reply) => {
    const url = String(request.body?.url || '').trim();
    if (!/^https:\/\//i.test(url)) return reply.badRequest('Webhook URL must use HTTPS');
    const events = Array.isArray(request.body?.events) ? request.body.events.map(String).slice(0, 50) : ['message.created'];
    const id = crypto.randomUUID();
    await prisma.$executeRaw`INSERT INTO global_platform_entities (id, kind, owner_id, title, payload) VALUES (${id}, 'webhook', ${uid(request)}, ${url.slice(0, 200)}, ${JSON.stringify({ url, events, enabled: true })}::jsonb)`;
    return reply.code(201).send({ id, url, events, enabled: true });
  });

  // E2EE boundary: AI requests must explicitly declare whether the source is private.
  // Private content is rejected here rather than silently forwarded to an external provider.
  app.post('/api/ai/safe-request', protectedRoute, async (request: any, reply) => {
    const privateContent = Boolean(request.body?.privateContent);
    const provider = String(request.body?.provider || 'local').toLowerCase();
    if (privateContent && provider !== 'local') return reply.code(409).send({ ok: false, code: 'E2EE_AI_BOUNDARY', message: 'Private E2EE content may only use the local provider unless the user explicitly decrypts/exports it.' });
    return { ok: true, provider: 'local', processed: false, message: 'Use the existing local AI routes for private-message processing.' };
  });
}
