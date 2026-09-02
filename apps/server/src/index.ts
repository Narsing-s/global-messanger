import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/uploads.js';
import callRoutes from './routes/calls.js';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const WEB_ORIGIN =
  process.env.WEB_ORIGIN ??
  'http://localhost:5173,https://web.narsingbeesetti006.workers.dev,https://global-messanger.onrender.com';

const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) return true;

  const configured = WEB_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);
  const isLocalDev =
    /^https?:\/\/localhost:\d+$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);

  return configured.includes(origin) || isLocalDev || origin === 'https://global-messanger.onrender.com';
};

await app.register(cors, {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
await app.register(staticPlugin, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/'
});

app.get('/', async () => ({
  ok: true,
  service: 'global-messenger-api',
  health: '/health'
}));

app.get('/health', async () => ({ ok: true }));

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(messageRoutes, { prefix: '/api/messages' });
await app.register(uploadRoutes, { prefix: '/api/uploads' });
await app.register(callRoutes, { prefix: '/api/calls' });

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

const httpServer = await app.listen({ port, host });

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true
  }
});

io.on('connection', socket => {
  socket.on('join', (userId: string) => socket.join(`user:${userId}`));

  socket.on('send_message', async (payload: { conversationId: string; senderId: string; body: string }) => {
    const message = await prisma.message.create({
      data: {
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        body: payload.body
      }
    });
    io.to(`conversation:${payload.conversationId}`).emit('message', message);
  });

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });
});

process.on('SIGTERM', async () => {
  await app.close();
  await prisma.$disconnect();
});
