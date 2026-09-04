import { cert, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaClient } from '@prisma/client';

let initialized = false;

function messaging() {
  if (initialized || getApps().length) {
    initialized = true;
    return getMessaging(getApp());
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  initialized = true;
  return getMessaging();
}

export async function sendPushForMessage(prisma: PrismaClient, message: any, senderName: string) {
  const fcm = messaging();
  if (!fcm) return { sent: 0, configured: false };
  const members = await prisma.conversationMember.findMany({
    where: { conversationId: message.conversationId, userId: { not: message.senderId } },
    select: { userId: true }
  });
  const userIds = members.map(m => m.userId);
  if (!userIds.length) return { sent: 0, configured: true };
  const devices = await prisma.pushDevice.findMany({ where: { userId: { in: userIds }, enabled: true }, select: { id: true, token: true } });
  if (!devices.length) return { sent: 0, configured: true };
  const title = senderName || 'New message';
  const body = message.type === 'text' ? String(message.body || '').slice(0, 160) : `Sent you ${message.type === 'image' ? 'a photo' : 'an attachment'}`;
  const response = await fcm.sendEachForMulticast({
    tokens: devices.map(d => d.token),
    notification: { title, body },
    data: { conversationId: String(message.conversationId), messageId: String(message.id), type: String(message.type || 'text') },
    android: { priority: 'high', notification: { channelId: 'global-messenger-messages' } }
  });
  const invalid = response.responses.flatMap((r, i) => r.success ? [] : [devices[i]?.id]).filter(Boolean) as string[];
  if (invalid.length) await prisma.pushDevice.updateMany({ where: { id: { in: invalid } }, data: { enabled: false } }).catch(() => {});
  return { sent: response.successCount, configured: true };
}
