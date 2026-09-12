import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const uid = (request: any) => String(request.user?.id || '');

const base32 = (bytes: Buffer) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
};
const base32Decode = (input: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0; const out: number[] = [];
  for (const c of input.toUpperCase().replace(/=+$/, '')) { const n = alphabet.indexOf(c); if (n < 0) continue; value = (value << 5) | n; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
};
const totp = (secret: string, counter = Math.floor(Date.now() / 30000)) => {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = mac[mac.length - 1] & 15;
  const code = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
};
const verifyTotp = (secret: string, code: string) => [-1, 0, 1].some(delta => totp(secret, Math.floor(Date.now() / 30000) + delta) === code);
const fingerprint = (value: string) => crypto.createHash('sha256').update(value).digest('hex').match(/.{1,4}/g)?.join(' ') || '';

export async function registerAdvancedPlatform(app: FastifyInstance, prisma: PrismaClient) {
  const protectedRoute = auth(app);

  // -----------------------------------------------------------------------
  // TOTP 2FA: real RFC-style 6 digit time-based OTP, no third-party secret.
  // -----------------------------------------------------------------------
  app.post('/api/security/2fa/setup', protectedRoute, async (request: any) => {
    const userId = uid(request);
    const secret = base32(crypto.randomBytes(20));
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } });
    return { secret, issuer: 'Global Messenger', account: user?.email || user?.username || userId, otpauth: `otpauth://totp/Global%20Messenger:${encodeURIComponent(user?.email || user?.username || userId)}?secret=${secret}&issuer=Global%20Messenger` };
  });

  app.post('/api/security/2fa/enable', protectedRoute, async (request: any, reply) => {
    const code = String(request.body?.code || '').replace(/\D/g, '');
    const secret = String(request.body?.secret || '');
    if (!secret || !/^\d{6}$/.test(code) || !verifyTotp(secret, code)) return reply.badRequest('Invalid authenticator code');
    await prisma.user.update({ where: { id: uid(request) }, data: { totpSecret: secret, totpEnabled: true } });
    return { ok: true, enabled: true };
  });

  app.post('/api/security/2fa/disable', protectedRoute, async (request: any, reply) => {
    const user = await prisma.user.findUnique({ where: { id: uid(request) }, select: { passwordHash: true, totpEnabled: true, totpSecret: true } });
    if (!user?.totpEnabled || !user.totpSecret) return { ok: true, enabled: false };
    const code = String(request.body?.code || '').replace(/\D/g, '');
    if (!verifyTotp(user.totpSecret, code)) return reply.badRequest('Authenticator code is required');
    await prisma.user.update({ where: { id: uid(request) }, data: { totpSecret: null, totpEnabled: false, recoveryCodesHash: null } });
    return { ok: true, enabled: false };
  });

  app.get('/api/security/2fa/status', protectedRoute, async (request: any) => {
    const u = await prisma.user.findUnique({ where: { id: uid(request) }, select: { totpEnabled: true } });
    return { enabled: Boolean(u?.totpEnabled) };
  });

  // -----------------------------------------------------------------------
  // Login history / device security.
  // -----------------------------------------------------------------------
  app.get('/api/security/login-history', protectedRoute, async (request: any) => prisma.loginHistory.findMany({ where: { userId: uid(request) }, orderBy: { createdAt: 'desc' }, take: 100 }));

  // E2EE key registration + human-readable security fingerprint.
  app.put('/api/security/device-key', protectedRoute, async (request: any, reply) => {
    const publicKey = String(request.body?.publicKey || '').trim();
    const version = Number(request.body?.version || 1);
    if (!publicKey || !Number.isInteger(version) || version < 1) return reply.badRequest('A public key and positive key version are required');
    await prisma.user.update({ where: { id: uid(request) }, data: { e2eePublicKey: publicKey, e2eeKeyVersion: version } });
    return { ok: true, fingerprint: fingerprint(publicKey), version };
  });

  app.get('/api/security/verification/:userId', protectedRoute, async (request: any, reply) => {
    const otherId = String(request.params.userId);
    const [me, other] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid(request) }, select: { id: true, e2eePublicKey: true, e2eeKeyVersion: true } }),
      prisma.user.findUnique({ where: { id: otherId }, select: { id: true, e2eePublicKey: true, e2eeKeyVersion: true } })
    ]);
    if (!other) return reply.notFound('User not found');
    return { verified: Boolean(me?.e2eePublicKey && other.e2eePublicKey), changed: me?.e2eeKeyVersion !== other.e2eeKeyVersion, mine: me?.e2eePublicKey ? fingerprint(me.e2eePublicKey) : null, theirs: other.e2eePublicKey ? fingerprint(other.e2eePublicKey) : null };
  });

  // -----------------------------------------------------------------------
  // Polls: persisted options and votes, tied to the existing Message.
  // -----------------------------------------------------------------------
  app.post('/api/polls', protectedRoute, async (request: any, reply) => {
    const b = request.body || {}; const question = String(b.question || '').trim(); const options = Array.isArray(b.options) ? b.options.map((x: any) => String(x).trim()).filter(Boolean) : [];
    if (!b.conversationId || question.length < 1 || options.length < 2 || options.length > 20) return reply.badRequest('conversationId, question and 2-20 options are required');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: String(b.conversationId), userId: uid(request) } } }); if (!member) return reply.forbidden('Not a conversation member');
    const message = await prisma.message.create({ data: { conversationId: String(b.conversationId), senderId: uid(request), body: question, type: 'poll' } });
    const poll = await prisma.poll.create({ data: { messageId: message.id, question, multiple: Boolean(b.multiple), expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, options: { create: options.map((text: string, position: number) => ({ text, position })) } }, include: { options: true } });
    return reply.code(201).send(poll);
  });

  app.post('/api/polls/:id/vote', protectedRoute, async (request: any, reply) => {
    const poll = await prisma.poll.findUnique({ where: { id: String(request.params.id) }, include: { options: true } });
    if (!poll) return reply.notFound('Poll not found');
    if (poll.expiresAt && poll.expiresAt <= new Date()) return reply.badRequest('Poll has expired');
    const ids = Array.isArray(request.body?.optionIds) ? request.body.optionIds.map(String) : [String(request.body?.optionId || '')];
    const selected = poll.options.filter(o => ids.includes(o.id));
    if (!selected.length || selected.length !== ids.length) return reply.badRequest('Invalid poll option');
    if (!poll.multiple && selected.length > 1) return reply.badRequest('Only one option can be selected');
    await prisma.$transaction(async tx => { await tx.pollVote.deleteMany({ where: { optionId: { in: poll.options.map(o => o.id) }, userId: uid(request) } }); await Promise.all(selected.map(o => tx.pollVote.create({ data: { optionId: o.id, userId: uid(request) } }))); });
    return { ok: true };
  });

  app.get('/api/polls/:id', protectedRoute, async (request: any, reply) => {
    const poll = await prisma.poll.findUnique({ where: { id: String(request.params.id) }, include: { options: { include: { votes: { select: { userId: true } } }, orderBy: { position: 'asc' } }, message: { select: { conversationId: true } } } });
    if (!poll) return reply.notFound('Poll not found');
    return { ...poll, options: poll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes.length, selected: o.votes.some(v => v.userId === uid(request)) })) };
  });

  // -----------------------------------------------------------------------
  // Scheduled messages. They are persisted as messages and activated by the
  // worker; the existing realtime layer remains untouched.
  // -----------------------------------------------------------------------
  app.post('/api/messages/schedule', protectedRoute, async (request: any, reply) => {
    const b = request.body || {}; const when = new Date(b.scheduledAt); const conversationId = String(b.conversationId || ''); const body = String(b.body || '').trim();
    if (!conversationId || !body || Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return reply.badRequest('A future scheduledAt, conversationId and body are required');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: uid(request) } } }); if (!member) return reply.forbidden('Not a conversation member');
    return reply.code(201).send(await prisma.message.create({ data: { conversationId, senderId: uid(request), body, type: 'scheduled', scheduledAt: when, scheduleStatus: 'PENDING' } }));
  });
  app.get('/api/messages/scheduled', protectedRoute, async (request: any) => prisma.message.findMany({ where: { senderId: uid(request), type: 'scheduled', scheduleStatus: 'PENDING' }, orderBy: { scheduledAt: 'asc' }, take: 100 }));
  app.delete('/api/messages/scheduled/:id', protectedRoute, async (request: any, reply) => { const id = String(request.params.id); const row = await prisma.message.findFirst({ where: { id, senderId: uid(request), type: 'scheduled', scheduleStatus: 'PENDING' } }); if (!row) return reply.notFound('Scheduled message not found'); await prisma.message.delete({ where: { id } }); return { ok: true }; });

  // -----------------------------------------------------------------------
  // Rich message types: location/live location/contact/event.
  // -----------------------------------------------------------------------
  const richMessage = async (request: any, reply: any, type: string, body: any) => {
    const conversationId = String(body?.conversationId || ''); if (!conversationId) return reply.badRequest('conversationId is required');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: uid(request) } } }); if (!member) return reply.forbidden('Not a conversation member');
    const message = await prisma.message.create({ data: { conversationId, senderId: uid(request), body: JSON.stringify({ type, ...body }), type } }); return reply.code(201).send(message);
  };
  app.post('/api/messages/location', protectedRoute, async (request: any, reply) => { const lat=Number(request.body?.latitude), lon=Number(request.body?.longitude); if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return reply.badRequest('Invalid coordinates'); return richMessage(request,reply,'location',{...request.body,latitude:lat,longitude:lon}); });
  app.post('/api/messages/live-location', protectedRoute, async (request: any, reply) => { const expiresAt = new Date(request.body?.expiresAt); if(Number.isNaN(expiresAt.getTime())||expiresAt<=new Date())return reply.badRequest('A future expiresAt is required'); return richMessage(request,reply,'live_location',{...request.body,expiresAt}); });
  app.post('/api/messages/contact', protectedRoute, async (request: any, reply) => richMessage(request,reply,'contact',{...request.body,name:String(request.body?.name||'').slice(0,120),phone:String(request.body?.phone||'').slice(0,40),email:String(request.body?.email||'').slice(0,320)}));
  app.post('/api/messages/event', protectedRoute, async (request: any, reply) => richMessage(request,reply,'event',{...request.body,title:String(request.body?.title||'').slice(0,160)}));

  // -----------------------------------------------------------------------
  // AI: deterministic local summary/extraction contracts; no fake provider.
  // -----------------------------------------------------------------------
  app.post('/api/ai/conversation-summary', protectedRoute, async (request: any, reply) => {
    const conversationId = String(request.body?.conversationId || ''); if (!conversationId) return reply.badRequest('conversationId is required');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: uid(request) } } }); if (!member) return reply.forbidden('Not a conversation member');
    const messages = await prisma.message.findMany({ where: { conversationId, deletedAt: null, scheduleStatus: 'SENT' }, orderBy: { createdAt: 'desc' }, take: 100, select: { body: true, type: true, createdAt: true } });
    const lines = messages.reverse().map(m => String(m.body).replace(/\s+/g,' ').trim()).filter(Boolean); const summary = lines.length ? lines.slice(-12).join(' • ').slice(0,2500) : 'No messages available.';
    return { summary, sourceCount: lines.length, provider: 'local-deterministic' };
  });
  app.post('/api/ai/document-understanding', protectedRoute, async (request: any) => { const text=String(request.body?.text||''); const words=text.trim()?text.trim().split(/\s+/).length:0; return { filename:String(request.body?.filename||'document'), provider:'local-deterministic', wordCount:words, characters:text.length, extractedText:text.slice(0,12000), insights:[] }; });
  app.get('/api/ai/smart-notifications', protectedRoute, async () => ({ enabled: true, mode: 'priority-only', provider: 'local-deterministic', rules: ['mentions','direct-messages','calls'] }));

  // Scheduled worker. It activates due records; the normal conversation query
  // will see them after refresh/reconnect, while preserving the existing socket API.
  const tick = async () => { try { await prisma.message.updateMany({ where: { type:'scheduled', scheduleStatus:'PENDING', scheduledAt:{ lte:new Date() } }, data:{ type:'text', scheduleStatus:'SENT' } }); } catch (e) { app.log.error(e, 'scheduled message worker failed'); } };
  void tick(); setInterval(() => void tick(), 15000).unref();
}
