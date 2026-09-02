import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');
const marker = '          /* -------------------------- Persist ----------------------------- */';
if (!source.includes(marker)) process.exit(0);

if (!source.includes('/* ---------------------- Blocked-contact delivery ---------------- */')) {
  const patch = `          /* ---------------------- Blocked-contact delivery ---------------- */
          // A blocker must not receive messages from the blocked sender. The
          // sender still receives the persisted message in their own room.
          const conversationMembers = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
            select: { userId: true }
          });
          const recipientIds = conversationMembers.map(member => member.userId).filter(id => id !== userId);
          const blockedRecipients = recipientIds.length
            ? await prisma.userBlock.findMany({
                where: { userId: { in: recipientIds }, blockedUserId: userId },
                select: { userId: true }
              })
            : [];
          const blockedRecipientIds = new Set(blockedRecipients.map(row => row.userId));

`;
  source = source.replace(marker, patch + marker);
}

if (!source.includes("message:blocked', { messageId")) {
  const blockRe = /          io\s+\.to\(\s+`conversation:\$\{data\.conversationId\}`\s+\)\s+\.emit\(\s+'message:new',\s*\{\s*\.\.\.message,\s*clientId:\s*data\.clientId\s*\}\s*\);\s*\n\s*\/\* ---------------------- Delivery Ack/;
  const replacement = `          if (blockedRecipientIds.size > 0) {
            // Send the event only to the blocked sender so the blocker never
            // receives or sees the new message in realtime.
            io.to(\`user:\${userId}\`).emit('message:new', { ...message, clientId: data.clientId });
            io.to(\`user:\${userId}\`).emit('message:blocked', { messageId: message.id, conversationId: message.conversationId, clientId: data.clientId });
          } else {
            io
              .to(\`conversation:\${data.conversationId}\`)
              .emit(
                'message:new',
                {
                  ...message,
                  clientId: data.clientId
                }
              );
          }

          /* ---------------------- Delivery Ack`;
  source = source.replace(blockRe, replacement);
}

fs.writeFileSync(file, source);
