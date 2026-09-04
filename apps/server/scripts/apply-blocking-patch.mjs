import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/index.ts');
let source = fs.readFileSync(file, 'utf8');
const marker = '          /* -------------------------- Persist ----------------------------- */';
if (!source.includes(marker)) process.exit(0);

// Blocked direct conversations must keep their existing history, but messages
// sent while either side has blocked the other must never be persisted or
// delivered. This is intentionally applied before prisma.message.create.
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
              // Do not create a database message and do not broadcast it to
              // either side. The existing chat/history remains untouched.
              socket.emit('message:blocked', {
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

// Remove the old behavior that persisted blocked messages and merely hid them
// from the blocker. The pre-persist guard above is now authoritative.
const oldBlockStart = source.indexOf('          /* ---------------------- Blocked-contact delivery ---------------- */');
const persistStart = source.indexOf(marker);
if (oldBlockStart !== -1 && oldBlockStart < persistStart) {
  const oldBlockEnd = source.indexOf(marker, oldBlockStart);
  if (oldBlockEnd !== -1) {
    const blockSection = source.slice(oldBlockStart, oldBlockEnd);
    const desiredStart = blockSection.indexOf('          /* ---------------------- Blocked-contact delivery ---------------- */');
    const desiredEnd = blockSection.indexOf('\n\n', desiredStart + 1);
    // The guard is already in the generated source; no further action needed.
  }
}

// Ensure the broadcast path is the normal conversation broadcast. Blocked
// messages never reach this point because the guard returns before persistence.
const blockedBroadcast = /          if \(blockedRecipientIds\.size > 0\) \{[\s\S]*?          \} else \{\n([\s\S]*?)          \}\n\n          \/\* ---------------------- Delivery Ack/;
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
