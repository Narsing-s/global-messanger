import fs from 'node:fs';
const file = new URL('../src/index.ts', import.meta.url).pathname;
let s = fs.readFileSync(file, 'utf8');
const importMarker = "import { registerAdvancedRoutes } from './advanced.js';";
if (!s.includes("./push-notifications.js")) s = s.replace(importMarker, `${importMarker}\nimport { sendPushForMessage } from './push-notifications.js';`);
const authMarker = "app.decorate(\n  'authenticate',";
if (!s.includes('session-touch-auth')) {
  const block = `const originalAuthenticate = async (request: any, reply: any) => { await request.jwtVerify(); };\n`;
  s = s.replace(authMarker, `${block}\n${authMarker}`);
  s = s.replace("  async (request: any) => {\n    await request.jwtVerify();\n  }", "  async (request: any, reply: any) => {\n    await request.jwtVerify();\n    if (request.user?.id) {\n      const raw = String(request.headers?.authorization || '');\n      const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';\n      if (token) { const crypto = await import('node:crypto'); const tokenHash = crypto.createHash('sha256').update(token).digest('hex'); await prisma.userSession.updateMany({ where: { tokenHash, userId: request.user.id, revokedAt: null }, data: { lastSeenAt: new Date() } }).catch(() => {}); }\n    }\n  }");
}
if (!s.includes('message-expiry-filter')) {
  s = s.replace("where: {\n        conversationId\n      },", "where: {\n        conversationId,\n        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]\n      },");
  s = s.replace("where: {\n        conversationId: data.conversationId,", "where: {\n        conversationId: data.conversationId,\n        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],");
  s = s.replace('/* -------------------------- Persist ----------------------------- */', `/* -------------------------- Persist ----------------------------- */\n          const disappearing = isMember.disappearingSeconds;\n          const expiresAt = disappearing && disappearing > 0 ? new Date(Date.now() + disappearing * 1000) : null;`);
  s = s.replace('attachmentSize:\n                  data.attachmentSize ||\n                  null', 'attachmentSize:\n                  data.attachmentSize ||\n                  null,\n\n                expiresAt');
}
if (!s.includes('upload-content-validation')) {
  s = s.replace("    if (!file) {\n      return reply.badRequest(\n        'File is required'\n      );\n    }", "    if (!file) {\n      return reply.badRequest('File is required');\n    }\n    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/wav','audio/ogg','video/mp4','video/webm','application/pdf','text/plain','application/zip']);\n    if (!allowed.has(file.mimetype.toLowerCase())) return reply.badRequest('This file type is not supported.');");
}
if (!s.includes('push-after-message')) {
  s = s.replace("          /* ---------------------- Delivery Ack ---------------------------- */", "          void sendPushForMessage(prisma, message, message.sender?.displayName || 'New message').catch(error => app.log.warn(error, 'Push notification delivery failed'));\n\n          /* ---------------------- Delivery Ack ---------------------------- */");
}
fs.writeFileSync(file, s);
console.log('Final production patch applied');
