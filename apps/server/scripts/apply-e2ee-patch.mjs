import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('global-messenger-e2ee-v1-routes')) {
  const anchor = '/* -------------------------------------------------------------------------- */\n/* Conversations';
  const patch = `/* -------------------------------------------------------------------------- */\n/* global-messenger-e2ee-v1-routes                                           */\n/* -------------------------------------------------------------------------- */\n\napp.put('/api/crypto/identity', { preHandler: [app.authenticate] }, async (request, reply) => {\n  const { id } = authUser(request);\n  const parsed = z.object({ publicKey: z.record(z.string(), z.any()), version: z.number().int().min(1).max(1).default(1) }).safeParse(request.body);\n  if (!parsed.success) return reply.badRequest('Invalid encryption public key');\n  const encoded = JSON.stringify(parsed.data.publicKey);\n  if (encoded.length > 4096) return reply.badRequest('Encryption public key is too large');\n  await prisma.user.update({ where: { id }, data: { e2eePublicKey: encoded, e2eeKeyVersion: parsed.data.version } });\n  return { ok: true, version: parsed.data.version };\n});\n\napp.get('/api/crypto/identity', { preHandler: [app.authenticate] }, async request => {\n  const { id } = authUser(request);\n  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, e2eePublicKey: true, e2eeKeyVersion: true } });\n  return { userId: id, publicKey: user?.e2eePublicKey ? JSON.parse(user.e2eePublicKey) : null, version: user?.e2eeKeyVersion ?? 1 };\n});\n\napp.get('/api/conversations/:id/crypto-keys', { preHandler: [app.authenticate] }, async (request, reply) => {\n  const { id: userId } = authUser(request);\n  const conversationId = String((request.params as any).id);\n  if (!await member(userId, conversationId)) return reply.forbidden('Not a conversation member');\n  const members = await prisma.conversationMember.findMany({\n    where: { conversationId },\n    select: { userId: true, user: { select: { e2eePublicKey: true } } }\n  });\n  return { conversationId, keys: members.map(item => ({ userId: item.userId, publicKey: item.user.e2eePublicKey ? JSON.parse(item.user.e2eePublicKey) : null })) };\n});\n\n`;
  if (!source.includes(anchor)) throw new Error('E2EE patch anchor not found');
  source = source.replace(anchor, patch + anchor);
}

fs.writeFileSync(file, source);
