import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');

const marker = '          /* -------------------------- Persist ----------------------------- */';
if (!source.includes(marker)) process.exit(0);

const patch = `          /* ---------------------- Blocked-contact delivery ---------------- */
          // If a recipient has blocked the sender, keep the message in the
          // conversation for the sender's own history, but do not broadcast it
          // to the blocking user. This gives the sender a normal sent message
          // (single tick in the client) without leaking it to the blocker.
          const conversationMembers = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
            select: { userId: true }
          });
          const recipientIds = conversationMembers
            .map(member => member.userId)
            .filter(id => id !== userId);
          const blockedRecipients = recipientIds.length
            ? await prisma.userBlock.findMany({
                where: {
                  userId: { in: recipientIds },
                  blockedUserId: userId
                },
                select: { userId: true }
              })
            : [];
          const blockedRecipientIds = new Set(blockedRecipients.map(row => row.userId));

`;

if (!source.includes('/* ---------------------- Blocked-contact delivery ---------------- */')) {
  source = source.replace(marker, patch + marker);
}

const broadcastMarker = `          io\n            .to(\n              \`conversation:\\${data.conversationId}\`\n            )\n            .emit(\n              'message:new',`;
const replacement = `          if (blockedRecipientIds.size > 0) {\n            // Only the sender receives the persisted message when the direct\n            // recipient has blocked them.\n            io.to(\`user:\\${userId}\`).emit('message:new', { ...message, clientId: data.clientId });\n            io.to(\`user:\\${userId}\`).emit('message:blocked', { messageId: message.id, conversationId: message.conversationId, clientId: data.clientId });\n          } else {\n            io\n              .to(\`conversation:\\${data.conversationId}\`)\n              .emit(\n                'message:new',`;

if (source.includes(broadcastMarker) && !source.includes("message:blocked', { messageId")) {
  source = source.replace(broadcastMarker, replacement);
  source = source.replace(`              }\n            );\n\n          /* ---------------------- Delivery Ack ---------------------------- */`, `              }\n            );\n          }\n\n          /* ---------------------- Delivery Ack ---------------------------- */`);
}

fs.writeFileSync(file, source);
