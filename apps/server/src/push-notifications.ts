import { PrismaClient } from '@prisma/client';

/**
 * Self-hosted notification hook.
 * Core messaging never depends on Firebase/FCM or another hosted push
 * provider. Realtime delivery is handled by the application's own Socket.IO
 * connection and normal unread/sync APIs. This hook performs no external
 * network call, so push-provider outages cannot block message delivery.
 */
export async function sendPushForMessage(
  _prisma: PrismaClient,
  message: any,
  senderName: string
) {
  return {
    sent: 0,
    configured: false,
    provider: 'self-hosted-realtime',
    conversationId: String(message?.conversationId ?? ''),
    messageId: String(message?.id ?? ''),
    senderName: senderName || 'New message'
  };
}
