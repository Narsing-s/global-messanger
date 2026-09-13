import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

const guard = "/* cross-device-idempotency-v1 */";
if (source.includes(guard)) process.exit(0);

const lookupAnchor = `          /* ---------------------- Blocked-contact delivery ---------------- */`;
const lookupPatch = `          ${guard}\n          const clientId = typeof data.clientId === 'string' && data.clientId.trim() ? data.clientId.trim() : null;\n          if (clientId) {\n            const existing = await prisma.message.findUnique({\n              where: { senderId_clientId: { senderId: userId, clientId } },\n              include: messageInclude\n            });\n            if (existing) {\n              socket.emit('message:delivered', {\n                messageId: existing.id,\n                conversationId: existing.conversationId,\n                clientId,\n                deliveredAt: new Date().toISOString(),\n                duplicate: true\n              });\n              return;\n            }\n          }\n\n`;

if (!source.includes(lookupAnchor)) throw new Error('Cross-device patch: message send anchor not found');
source = source.replace(lookupAnchor, lookupPatch + lookupAnchor);

const createAnchor = `                senderId:\n                  userId,`;
const createPatch = `                senderId:\n                  userId,\n\n                clientId,`;
if (!source.includes(createAnchor)) throw new Error('Cross-device patch: message create anchor not found');
source = source.replace(createAnchor, createPatch);

const expiryAnchor = `                attachmentSize:\n                  data.attachmentSize ||\n                  null`;
const expiryPatch = `                attachmentSize:\n                  data.attachmentSize ||\n                  null,\n\n                expiresAt`;
if (!source.includes(expiryAnchor)) throw new Error('Cross-device patch: attachment anchor not found');
source = source.replace(expiryAnchor, expiryPatch);

const expiryValue = `                expiresAt\n`;
if (!source.includes(expiryValue)) throw new Error('Cross-device patch: expiry field anchor not found');
source = source.replace(expiryValue, `                expiresAt: expiresAt\n`);

fs.writeFileSync(file, source);
console.log('[Production] cross-device message idempotency patch applied');
