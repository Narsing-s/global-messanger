import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');
const marker = '          /* -------------------------- Persist ----------------------------- */';
if (!source.includes(marker)) process.exit(0);

// Blocked direct conversations keep their existing history, but any new
// message sent while either side has blocked the other must be rejected
// BEFORE prisma.message.create. This also covers call-signal/call-log payloads
// because those are sent through the same message:send persistence path.
if (!source.includes('/* ---------------------- Blocked-contact delivery ---------------- */')) {
  const patch = `          /* ---------------------- Blocked-contact delivery ---------------- */
          const conversationMembers = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
            select: { userId: true }
          });
          const recipientIds = conversationMembers
            .map(member => member.userId)
            .filter(id => id !== userId);
          const isDirectConversation = conversationMembers.length === 2;

          if (isDirectConversation && recipientIds.length === 1) {
            const otherUserId = recipientIds[0];
            const block = await prisma.userBlock.findFirst({
              where: {
                OR: [
                  { userId, blockedUserId: otherUserId },
                  { userId: otherUserId, blockedUserId: userId }
                ]
              },
              select: { userId: true, blockedUserId: true }
            });

            if (block) {
              // Reject without creating a DB row or broadcasting anything.
              // Existing history remains untouched and becomes usable again
              // automatically after the block relationship is removed.
              socket.emit('message:failed', {
                clientId: data.clientId,
                conversationId: data.conversationId,
                error: 'Message not sent because this contact is blocked.'
              });
              return;
            }
          }

`;
  source = source.replace(marker, patch + marker);
}

// Ensure the generated handler never uses a delivery-only block filter that
// persists the message first. The pre-persist guard above is authoritative.
const blockedBroadcast = /          if \\(blockedRecipientIds\\.size > 0\\) \\{[\\s\\S]*?          \\} else \\{\\n([\\s\\S]*?)          \\}\\n\\n          \\/\\* ---------------------- Delivery Ack/;
if (blockedBroadcast.test(source)) {
  source = source.replace(blockedBroadcast, `          io
            .to(
              \`conversation:\${data.conversationId}\`
            )
            .emit(
              'message:new',
              {
                ...message,
                clientId: data.clientId
              }
            );

          /* ---------------------- Delivery Ack`);
}

fs.writeFileSync(file, source);
