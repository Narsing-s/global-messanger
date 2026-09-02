import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');

const addOnce = (needle, patch, label) => {
  if (source.includes(label)) return;
  if (!source.includes(needle)) throw new Error(`Reliability patch anchor not found: ${label}`);
  source = source.replace(needle, patch + needle);
};

addOnce(
  'const messageInclude = {',
  `const MESSAGE_CLIENT_ID_MAX = 120;\nconst MAX_MESSAGE_BODY = 10000;\nconst MESSAGE_WINDOW_MS = 10000;\nconst MESSAGE_WINDOW_LIMIT = 30;\nconst messageRate = new Map<string, { startedAt: number; count: number }>();\n\n`,
  'const MESSAGE_CLIENT_ID_MAX'
);

if (!source.includes('receipts: true')) {
  source = source.replace(
    '  reactions: true,\n  replyTo:',
    '  reactions: true,\n  receipts: true,\n  replyTo:'
  );
}

// Mark messages as delivered during reconnect/offline sync. Delivery is only
// acknowledged for the recipient that actually has the message now.
const syncAnchor = `          const messages =\n            await prisma.message.findMany({`;
if (!source.includes('offline-sync delivery receipts')) {
  const deliveryPatch = `          /* ---------------- offline-sync delivery receipts ---------------- */\n          // The recipient is now online and has received the synchronized history.\n          const incomingForUser = messages.filter(message => message.senderId !== userId);\n          for (const message of incomingForUser) {\n            await prisma.messageReceipt.upsert({\n              where: { messageId_userId: { messageId: message.id, userId } },\n              create: { messageId: message.id, userId, deliveredAt: new Date() },\n              update: { deliveredAt: new Date() }\n            });\n            io.to(\`user:\${message.senderId}\`).emit('message:delivered', {\n              messageId: message.id,\n              conversationId: message.conversationId,\n              recipientId: userId,\n              deliveredAt: new Date().toISOString()\n            });\n          }\n\n`;
  // This insertion must happen after the query, not before it.
  const afterQuery = `              include:\n                messageInclude\n            });\n\n          socket.emit(\n            'sync:messages',`;
  if (!source.includes('offline-sync delivery receipts')) {
    source = source.replace(afterQuery, `              include:\n                messageInclude\n            });\n\n${deliveryPatch}          socket.emit(\n            'sync:messages',`);
  }
}

// Persist read receipts in addition to the existing conversation lastReadAt.
const readMarker = `    await prisma.conversationMember.update({\n      where: {\n        conversationId_userId: {\n          conversationId,\n          userId: id\n        }\n      },`;
if (!source.includes('persisted-message-read-receipts')) {
  const readPatch = `    /* ---------------- persisted-message-read-receipts ---------------- */\n    const unreadMessages = await prisma.message.findMany({\n      where: {\n        conversationId,\n        senderId: { not: id },\n        createdAt: { lte: at }\n      },\n      select: { id: true, senderId: true }\n    });\n\n    if (unreadMessages.length) {\n      await prisma.$transaction(\n        unreadMessages.map(message => prisma.messageReceipt.upsert({\n          where: { messageId_userId: { messageId: message.id, userId: id } },\n          create: { messageId: message.id, userId: id, deliveredAt: at, readAt: at },\n          update: { deliveredAt: at, readAt: at }\n        }))\n      );\n    }\n\n`;
  source = source.replace(readMarker, readPatch + readMarker);
}

// Add messageIds to the read event so clients can update exact bubbles.
source = source.replace(
  `          userId: id,\n          at\n        }\n      );`,
  `          userId: id,\n          at,\n          messageIds: unreadMessages.map(message => message.id)\n        }\n      );`
);

// Harden upload validation without changing the existing 25 MB limit.
const uploadFileAnchor = `    if (!file) {\n      return reply.badRequest(\n        'File is required'\n      );\n    }`;
if (!source.includes('allowed-upload-mime-types')) {
  const uploadPatch = `\n\n    /* ---------------- allowed-upload-mime-types ---------------- */\n    const allowedMimeTypes = new Set([\n      'image/jpeg', 'image/png', 'image/gif', 'image/webp',\n      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',\n      'video/mp4', 'video/webm', 'video/quicktime',\n      'application/pdf', 'text/plain', 'application/zip',\n      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'\n    ]);\n\n    if (!allowedMimeTypes.has(file.mimetype)) {\n      return reply.badRequest('This file type is not supported');\n    }\n\n    if (file.filename.length > 180) {\n      return reply.badRequest('File name is too long');\n    }`;
  source = source.replace(uploadFileAnchor, uploadFileAnchor + uploadPatch);
}

// Make the message send path idempotent and rate-limited.
const messageSendStart = `        try {\n          if (\n            !data?.conversationId ||\n            !data?.body?.trim()\n          ) {`;
if (!source.includes('message-idempotency-and-rate-limit')) {
  const hardening = `        try {\n          /* ---------------- message-idempotency-and-rate-limit ---------------- */\n          const now = Date.now();\n          const bucket = messageRate.get(userId);\n          if (!bucket || now - bucket.startedAt >= MESSAGE_WINDOW_MS) {\n            messageRate.set(userId, { startedAt: now, count: 1 });\n          } else if (bucket.count >= MESSAGE_WINDOW_LIMIT) {\n            socket.emit('message:failed', {\n              clientId: data?.clientId,\n              conversationId: data?.conversationId,\n              error: 'Too many messages. Please slow down.'\n            });\n            return;\n          } else {\n            bucket.count += 1;\n          }\n\n          const clientId = typeof data?.clientId === 'string'\n            ? data.clientId.trim().slice(0, MESSAGE_CLIENT_ID_MAX)\n            : '';\n          if (!clientId) {\n            socket.emit('message:failed', {\n              clientId: data?.clientId,\n              conversationId: data?.conversationId,\n              error: 'A client message id is required'\n            });\n            return;\n          }\n\n          const existingMessage = await prisma.message.findFirst({\n            where: { senderId: userId, clientId },\n            include: messageInclude\n          });\n          if (existingMessage) {\n            socket.emit('message:ack', {\n              messageId: existingMessage.id,\n              conversationId: existingMessage.conversationId,\n              clientId,\n              createdAt: existingMessage.createdAt\n            });\n            return;\n          }\n\n          if (\n            !data?.conversationId ||\n            !data?.body?.trim()\n          ) {`;
  source = source.replace(messageSendStart, hardening);
}

// Add clientId to the persisted Message create operation.
source = source.replace(
  `                senderId:\n                  userId,\n\n                body:`,
  `                senderId:\n                  userId,\n\n                clientId,\n\n                body:`
);

// Bound message text before persistence.
source = source.replace(
  `                body:\n                  data.body.trim(),`,
  `                body:\n                  data.body.trim().slice(0, MAX_MESSAGE_BODY),`
);

// Replace the old unconditional sender-only delivery acknowledgement with
// recipient-aware durable delivery receipts.
const oldDelivery = `          io\n            .to(\n              \`user:\${userId}\`\n            )\n            .emit(\n              'message:delivered',\n              {\n                messageId:\n                  message.id,\n\n                conversationId:\n                  message.conversationId,\n\n                clientId:\n                  data.clientId,\n\n                deliveredAt:\n                  new Date().toISOString()\n              }\n            );`;
if (source.includes(oldDelivery) && !source.includes('recipient-aware durable delivery')) {
  const newDelivery = `          /* ---------------- recipient-aware durable delivery ---------------- */\n          const recipients = await prisma.conversationMember.findMany({\n            where: { conversationId: message.conversationId, userId: { not: userId } },\n            select: { userId: true }\n          });\n          const deliveredAt = new Date();\n          for (const recipient of recipients) {\n            if (online.has(recipient.userId)) {\n              await prisma.messageReceipt.upsert({\n                where: { messageId_userId: { messageId: message.id, userId: recipient.userId } },\n                create: { messageId: message.id, userId: recipient.userId, deliveredAt },\n                update: { deliveredAt }\n              });\n              io.to(\`user:\${userId}\`).emit('message:delivered', {\n                messageId: message.id,\n                conversationId: message.conversationId,\n                clientId: data.clientId,\n                recipientId: recipient.userId,\n                deliveredAt: deliveredAt.toISOString()\n              });\n            }\n          }`;
  source = source.replace(oldDelivery, newDelivery);
}

// Keep the delivery rate map bounded.
if (!source.includes('messageRate.size > 50000')) {
  source = source.replace(
    `          const now = Date.now();\n          const bucket = messageRate.get(userId);`,
    `          const now = Date.now();\n          if (messageRate.size > 50000) {\n            for (const [key, value] of messageRate) {\n              if (now - value.startedAt > MESSAGE_WINDOW_MS) messageRate.delete(key);\n            }\n          }\n          const bucket = messageRate.get(userId);`
  );
}

fs.writeFileSync(file, source);
