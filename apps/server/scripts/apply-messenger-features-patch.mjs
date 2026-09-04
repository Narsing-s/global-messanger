import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.resolve(root, 'apps/server/src/advanced.ts');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');

const marker = "  app.post('/api/ai/assist', auth, async (request, reply) =>";
const block = `
  // Profile and chat information
  app.get('/api/users/me', auth, async request => {
    const userId = (request.user as AuthRequest['user']).id;
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, lastSeenAt: true, createdAt: true } });
  });
  app.patch('/api/users/me', auth, async (request, reply) => {
    const parsed = z.object({ displayName: z.string().trim().min(1).max(60).optional(), avatarUrl: z.string().trim().url().max(2048).nullable().optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid profile details.');
    const userId = (request.user as AuthRequest['user']).id;
    return prisma.user.update({ where: { id: userId }, data: parsed.data, select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, lastSeenAt: true } });
  });

  app.get<{ Params: IdParams }>('/api/conversations/:id/info', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.notFound('Chat not found.');
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeenAt: true } } } }, pins: { orderBy: { createdAt: 'desc' }, include: { message: { include: { sender: { select: { id: true, username: true, displayName: true } } } }, pinnedBy: { select: { id: true, displayName: true, username: true } } } } } });
    if (!conversation) return reply.notFound('Chat not found.');
    return conversation;
  });

  // Pins are available to every conversation member; only the conversation creator can remove another member or rename a group.
  app.get<{ Params: IdParams }>('/api/conversations/:id/pins', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.notFound('Chat not found.');
    return prisma.pinnedMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, include: { message: { include: { sender: { select: { id: true, username: true, displayName: true } } } }, pinnedBy: { select: { id: true, displayName: true, username: true } } } });
  });
  app.post<{ Params: IdParams }>('/api/conversations/:id/pins', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const parsed = z.object({ messageId: z.string().min(1) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('messageId is required.');
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.notFound('Chat not found.');
    const message = await prisma.message.findFirst({ where: { id: parsed.data.messageId, conversationId } });
    if (!message) return reply.notFound('Message not found.');
    return prisma.pinnedMessage.upsert({ where: { conversationId_messageId: { conversationId, messageId: message.id } }, create: { conversationId, messageId: message.id, pinnedById: userId }, update: { pinnedById: userId } });
  });
  app.delete<{ Params: IdParams }>('/api/conversations/:id/pins/:messageId', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const messageId = String((request.params as any).messageId);
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!member) return reply.notFound('Chat not found.');
    await prisma.pinnedMessage.deleteMany({ where: { conversationId, messageId } });
    return { ok: true };
  });

  // Forward an existing message without exposing messages from conversations the user cannot access.
  app.post('/api/messages/forward', auth, async (request, reply) => {
    const parsed = z.object({ messageId: z.string().min(1), conversationId: z.string().min(1) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('messageId and conversationId are required.');
    const userId = (request.user as AuthRequest['user']).id;
    const [message, destination] = await Promise.all([
      prisma.message.findUnique({ where: { id: parsed.data.messageId } }),
      prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: parsed.data.conversationId, userId } } })
    ]);
    if (!message) return reply.notFound('Message not found.');
    if (!destination) return reply.forbidden('You are not a member of the destination chat.');
    const sourceAccess = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: message.conversationId, userId } } });
    if (!sourceAccess) return reply.forbidden('You cannot forward this message.');
    const created = await prisma.message.create({ data: { conversationId: parsed.data.conversationId, senderId: userId, body: message.body, type: message.type, attachmentUrl: message.attachmentUrl, attachmentName: message.attachmentName, attachmentMime: message.attachmentMime, attachmentSize: message.attachmentSize, clientId: crypto.randomUUID() }, include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
    return created;
  });

  // Group administration uses the conversation creator as the stable administrator, so no schema migration is required.
  app.patch<{ Params: IdParams }>('/api/conversations/:id/group', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const parsed = z.object({ title: z.string().trim().min(1).max(80) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('A group name is required.');
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { creatorId: true, isGroup: true } });
    if (!conversation?.isGroup) return reply.badRequest('This is not a group chat.');
    if (conversation.creatorId !== userId) return reply.forbidden('Only the group admin can change group details.');
    return prisma.conversation.update({ where: { id: conversationId }, data: { title: parsed.data.title } });
  });
  app.post<{ Params: IdParams }>('/api/conversations/:id/members', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('userId is required.');
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { creatorId: true, isGroup: true } });
    if (!conversation?.isGroup) return reply.badRequest('This is not a group chat.');
    if (conversation.creatorId !== userId) return reply.forbidden('Only the group admin can add members.');
    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } });
    if (!target) return reply.notFound('User not found.');
    return prisma.conversationMember.upsert({ where: { conversationId_userId: { conversationId, userId: target.id } }, create: { conversationId, userId: target.id }, update: {} });
  });
  app.delete<{ Params: IdParams }>('/api/conversations/:id/members/:userId', auth, async (request, reply) => {
    const userId = (request.user as AuthRequest['user']).id;
    const conversationId = request.params.id;
    const targetUserId = String((request.params as any).userId);
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { creatorId: true, isGroup: true } });
    if (!conversation?.isGroup) return reply.badRequest('This is not a group chat.');
    if (conversation.creatorId !== userId) return reply.forbidden('Only the group admin can remove members.');
    if (targetUserId === conversation.creatorId) return reply.badRequest('The group admin cannot be removed.');
    await prisma.conversationMember.deleteMany({ where: { conversationId, userId: targetUserId } });
    return { ok: true };
  });

`;
if (!source.includes("'/api/conversations/:id/pins'")) source = source.replace(marker, block + marker);
fs.writeFileSync(file, source);
