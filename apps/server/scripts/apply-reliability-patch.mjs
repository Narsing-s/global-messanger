import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');

const addOnce = (needle, patch, label) => {
  if (source.includes(label)) return;
  if (!source.includes(needle)) throw new Error(`Reliability patch anchor not found: ${label}`);
  source = source.replace(needle, patch + needle);
};

addOnce('const messageInclude = {', `const MESSAGE_CLIENT_ID_MAX = 120;\nconst MAX_MESSAGE_BODY = 10000;\nconst MESSAGE_WINDOW_MS = 10000;\nconst MESSAGE_WINDOW_LIMIT = 30;\nconst messageRate = new Map<string, { startedAt: number; count: number }>();\n\n`, 'const MESSAGE_CLIENT_ID_MAX');

if (!source.includes('receipts: true')) source = source.replace('  reactions: true,\n  replyTo:', '  reactions: true,\n  receipts: true,\n  replyTo:');

if (!source.includes('offline-sync delivery receipts')) {
  const afterQuery = `              include:\n                messageInclude\n            });\n\n          socket.emit(\n            'sync:messages',`;
  const deliveryPatch = `              include:\n                messageInclude\n            });\n\n          /* ---------------- offline-sync delivery receipts ---------------- */\n          const incomingForUser = messages.filter(message => message.senderId !== userId);\n          for (const message of incomingForUser) {\n            const deliveredAt = new Date();\n            await prisma.messageReceipt.upsert({\n              where: { messageId_userId: { messageId: message.id, userId } },\n              create: { messageId: message.id, userId, deliveredAt },\n              update: { deliveredAt }\n            });\n            io.to(\`user:\${message.senderId}\`).emit('message:delivered', {\n              messageId: message.id,\n              conversationId: message.conversationId,\n              recipientId: userId,\n              deliveredAt: deliveredAt.toISOString()\n            });\n          }\n\n          socket.emit(\n            'sync:messages',`;
  source = source.replace(afterQuery, deliveryPatch);
}

const readMarker = `    await prisma.conversationMember.update({\n      where: {\n        conversationId_userId: {\n          conversationId,\n          userId: id\n        }\n      },`;
if (!source.includes('persisted-message-read-receipts')) {
  const readPatch = `    /* ---------------- persisted-message-read-receipts ---------------- */\n    const unreadMessages = await prisma.message.findMany({\n      where: { conversationId, senderId: { not: id }, createdAt: { lte: at } },\n      select: { id: true, senderId: true }\n    });\n\n    if (unreadMessages.length) {\n      await prisma.$transaction(unreadMessages.map(message => prisma.messageReceipt.upsert({\n        where: { messageId_userId: { messageId: message.id, userId: id } },\n        create: { messageId: message.id, userId: id, deliveredAt: at, readAt: at },\n        update: { deliveredAt: at, readAt: at }\n      })));\n    }\n\n`;
  source = source.replace(readMarker, readPatch + readMarker);
}

source = source.replace(
  `          userId: id,\n          at\n        }\n      );`,
  `          userId: id,\n          at,\n          messageIds: unreadMessages.map(message => message.id)\n        }\n      );`
);

const uploadFileAnchor = `    if (!file) {\n      return reply.badRequest(\n        'File is required'\n      );\n    }`;
if (!source.includes('allowed-upload-mime-types')) {
  const uploadPatch = `\n\n    /* ---------------- allowed-upload-mime-types ---------------- */\n    const allowedMimeTypes = new Set([\n      'image/jpeg', 'image/png', 'image/gif', 'image/webp',\n      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',\n      'video/mp4', 'video/webm', 'video/quicktime',\n      'application/pdf', 'text/plain', 'application/zip',\n      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'\n    ]);\n\n    if (!allowedMimeTypes.has(file.mimetype)) return reply.badRequest('This file type is not supported');\n    if (file.filename.length > 180) return reply.badRequest('File name is too long');`;
  source = source.replace(uploadFileAnchor, uploadFileAnchor + uploadPatch);
}

if (!source.includes('message-idempotency-and-rate-limit')) {
  const sendPattern = /        try \{\n          if \(\n            !data\?\.conversationId \|\|\n            !data\?\.body\?\.trim\(\)\n          \) \{[\s\S]*?          }\n\n          \/\* -------------------------- Persist ----------------------------- \*\//;
  const hardening = `        try {\n          /* ---------------- message-idempotency-and-rate-limit ---------------- */\n          const now = Date.now();\n          if (messageRate.size > 50000) {\n            for (const [key, value] of messageRate) {\n              if (now - value.startedAt > MESSAGE_WINDOW_MS) messageRate.delete(key);\n            }\n          }\n          const bucket = messageRate.get(userId);\n          if (!bucket || now - bucket.startedAt >= MESSAGE_WINDOW_MS) messageRate.set(userId, { startedAt: now, count: 1 });\n          else if (bucket.count >= MESSAGE_WINDOW_LIMIT) {\n            socket.emit('message:failed', { clientId: data?.clientId, conversationId: data?.conversationId, error: 'Too many messages. Please slow down.' });\n            return;\n          } else bucket.count += 1;\n\n          const clientId = typeof data?.clientId === 'string' ? data.clientId.trim().slice(0, MESSAGE_CLIENT_ID_MAX) : '';\n          if (!clientId) {\n            socket.emit('message:failed', { clientId: data?.clientId, conversationId: data?.conversationId, error: 'A client message id is required' });\n            return;\n          }\n          if (!data?.conversationId || !data?.body?.trim()) {\n            socket.emit('message:failed', { clientId, conversationId: data?.conversationId, error: 'Message body is required' });\n            return;\n          }\n\n          const isMember = await member(userId, data.conversationId);\n          if (!isMember) {\n            socket.emit('message:failed', { clientId, conversationId: data.conversationId, error: 'You are not a member of this conversation' });\n            return;\n          }\n\n          const existingMessage = await prisma.message.findFirst({\n            where: { senderId: userId, clientId, conversationId: data.conversationId },\n            include: messageInclude\n          });\n          if (existingMessage) {\n            socket.emit('message:ack', { messageId: existingMessage.id, conversationId: existingMessage.conversationId, clientId, createdAt: existingMessage.createdAt });\n            return;\n          }\n\n          /* -------------------------- Persist ----------------------------- */`;
  const match = source.match(sendPattern);
  if (!match) throw new Error('Reliability patch anchor not found: message send block');
  source = source.replace(sendPattern, hardening);
}

source = source.replace(`                senderId:\n                  userId,\n\n                body:`, `                senderId:\n                  userId,\n\n                clientId,\n\n                body:`);
source = source.replace(`                body:\n                  data.body.trim(),`, `                body:\n                  data.body.trim().slice(0, MAX_MESSAGE_BODY),`);

const oldDelivery = `          io\n            .to(\n              \`user:\${userId}\`\n            )\n            .emit(\n              'message:delivered',\n              {\n                messageId:\n                  message.id,\n\n                conversationId:\n                  message.conversationId,\n\n                clientId:\n                  data.clientId,\n\n                deliveredAt:\n                  new Date().toISOString()\n              }\n            );`;
if (source.includes(oldDelivery) && !source.includes('recipient-aware durable delivery')) {
  const newDelivery = `          /* ---------------- sender acknowledgement ---------------- */\n          socket.emit('message:ack', { messageId: message.id, conversationId: message.conversationId, clientId: data.clientId, createdAt: message.createdAt });\n\n          /* ---------------- recipient-aware durable delivery ---------------- */\n          const recipients = await prisma.conversationMember.findMany({\n            where: { conversationId: message.conversationId, userId: { not: userId } },\n            select: { userId: true }\n          });\n          for (const recipient of recipients) {\n            if (online.has(recipient.userId)) {\n              const deliveredAt = new Date();\n              await prisma.messageReceipt.upsert({\n                where: { messageId_userId: { messageId: message.id, userId: recipient.userId } },\n                create: { messageId: message.id, userId: recipient.userId, deliveredAt },\n                update: { deliveredAt }\n              });\n              io.to(\`user:\${userId}\`).emit('message:delivered', { messageId: message.id, conversationId: message.conversationId, clientId: data.clientId, recipientId: recipient.userId, deliveredAt: deliveredAt.toISOString() });\n            }\n          }`;
  source = source.replace(oldDelivery, newDelivery);
}

fs.writeFileSync(file, source);
