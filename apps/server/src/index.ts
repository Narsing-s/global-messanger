
import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { registerAdvancedRoutes } from './advanced.js';
import { sendPushForMessage } from './push-notifications.js';
import { Server } from 'socket.io';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs/promises';
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: any,
      reply: any
    ) => Promise<void>;
  }
}
const prisma = new PrismaClient();

const app = Fastify({
  logger: true
});

const PORT = Number(process.env.PORT ?? 4000);

const WEB_ORIGIN =
  process.env.WEB_ORIGIN ??
  'http://localhost:5173,https://web.narsingbeesetti006.workers.dev,https://global-messenger-help-centre.onrender.com';

const isAllowedOrigin = (origin?: string | null) => {
  // Allow requests without an Origin header and native Capacitor/Ionic apps.
  if (!origin || origin === 'null') return true;

  const configured = WEB_ORIGIN
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const isLocalDev =
    /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);

  const isNativeApp =
    /^capacitor:\/\/localhost$/.test(origin) ||
    /^ionic:\/\/localhost$/.test(origin);

  const isHelpCentre =
    origin === 'https://global-messenger-help-centre.onrender.com';

  return configured.includes(origin) || isLocalDev || isNativeApp || isHelpCentre;
};

const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? 'uploads'
);

await fs.mkdir(UPLOAD_DIR, {
  recursive: true
});

/* -------------------------------------------------------------------------- */
/* Plugins                                                                    */
/* -------------------------------------------------------------------------- */

await app.register(cors, {
  origin: (origin, cb) => {
    cb(null, isAllowedOrigin(origin));
  },
  credentials: true
});

await app.register(sensible);

await app.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

await app.register(fastifyStatic, {
  root: UPLOAD_DIR,
  prefix: '/uploads/'
});

await app.register(jwt, {
  secret:
    process.env.JWT_SECRET ??
    'development-only-secret'
});

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      username: string;
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

app.decorate(
  'authenticate',
  async (request: any) => {
    await request.jwtVerify();
  }
);

const authUser = (
  request: any
): {
  id: string;
  username: string;
} => {
  return request.user as {
    id: string;
    username: string;
  };
};

/* -------------------------------------------------------------------------- */
/* Shared Prisma selections                                                   */
/* -------------------------------------------------------------------------- */

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  lastSeenAt: true
} as const;

const messageInclude = {
  sender: {
    select: userSelect
  },
  reactions: true,
  replyTo: {
    select: {
      id: true,
      body: true,
      senderId: true
    }
  }
} as const;

const conversationInclude = {
  members: {
    include: {
      user: {
        select: userSelect
      }
    }
  },
  messages: {
    orderBy: {
      createdAt: 'desc' as const
    },
    take: 1,
    include: messageInclude
  }
};

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

app.get('/', async () => {
  return {
    ok: true,
    service: 'global-messenger-api'
  };
});
