import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

await app.register(cors, { origin: WEB_ORIGIN, credentials: true });
await app.register(sensible);
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'development-only-secret' });

declare module '@fastify/jwt' {
  interface FastifyJWT { user: { id: string; username: string }; }
}

app.decorate('authenticate', async (request: any) => {
  await request.jwtVerify();
});

app.get('/health', async () => ({ ok: true, service: 'global-messenger', time: new Date().toISOString() }));

const authSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().trim().min(1).max(60),
  password: z.string().min(8).max(128)
});

app.post('/api/auth/register', async (request, reply) => {
  const parsed = authSchema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.flatten());
  const { username, displayName, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (exists) return reply.conflict('Username is already taken');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { username: username.toLowerCase(), displayName, passwordHash } });
  const token = app.jwt.sign({ id: user.id, username: user.username });
  return reply.code(201).send({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
});

app.post('/api/auth/login', async (request, reply) => {
  const body = z.object({ username: z.string().trim(), password: z.string().min(1) }).safeParse(request.body);
  if (!body.success) return reply.badRequest(body.error.flatten());
  const user = await prisma.user.findUnique({ where: { username: body.data.username.toLowerCase() } });
  if (!user || !(await bcrypt.compare(body.data.password, user.passwordHash))) return reply.unauthorized('Invalid username or password');
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  const token = app.jwt.sign({ id: user.id, username: user.username });
  return { token, user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } };
});

app.get('/api/users/search', { preHandler: [app.authenticate] }, async (request) => {
  const q = String((request.query as any)?.q ?? '').trim().toLowerCase();
  if (!q) return [];
  return prisma.user.findMany({
    where: { username: { contains: q, mode: 'insensitive' } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeenAt: true },
    take: 20
  });
});

const httpServer = await app.listen({ port: PORT, host: '0.0.0.0' });
const io = new Server(app.server, { cors: { origin: WEB_ORIGIN, credentials: true } });
const online = new Map<string, number>();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = app.jwt.verify<{ id: string; username: string }>(token);
    socket.data.user = payload;
    next();
  } catch { next(new Error('Invalid authentication token')); }
});

io.on('connection', async (socket) => {
  const userId = socket.data.user.id as string;
  online.set(userId, (online.get(userId) ?? 0) + 1);
  socket.join(`user:${userId}`);
  io.emit('presence:update', { userId, online: true });

  socket.on('conversation:join', (conversationId: string) => socket.join(`conversation:${conversationId}`));
  socket.on('typing', (data: { conversationId: string; typing: boolean }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing', { userId, typing: data.typing });
  });
  socket.on('message:send', async (data: { conversationId: string; body: string; clientId?: string }) => {
    if (!data?.conversationId || !data.body?.trim()) return;
    const member = await prisma.conversationMember.findFirst({ where: { conversationId: data.conversationId, userId } });
    if (!member) return;
    const message = await prisma.message.create({ data: { conversationId: data.conversationId, senderId: userId, body: data.body.trim() }, include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } });
    io.to(`conversation:${data.conversationId}`).emit('message:new', { ...message, clientId: data.clientId });
  });
  socket.on('disconnect', async () => {
    const count = (online.get(userId) ?? 1) - 1;
    if (count <= 0) {
      online.delete(userId);
      await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
      io.emit('presence:update', { userId, online: false });
    } else online.set(userId, count);
  });
});

app.log.info(`Global Messenger API listening at ${httpServer}`);
