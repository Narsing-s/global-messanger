
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
  'http://localhost:5173,https://web.narsingbeesetti006.workers.dev';

const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) return true;

  const configured = WEB_ORIGIN
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const isLocalDev =
    /^https?:\/\/localhost:\d+$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);

  return configured.includes(origin) || isLocalDev;
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

app.get(
  '/health',
  async () => {
    return {
      ok: true,
      service: 'global-messenger',
      time: new Date().toISOString()
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const authSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),

  displayName: z
    .string()
    .trim()
    .min(1)
    .max(60),

  password: z
    .string()
    .min(8)
    .max(128)
});

/* -------------------------------------------------------------------------- */
/* Register                                                                   */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/auth/register',
  async (request, reply) => {
    const parsed = authSchema.safeParse(
      request.body
    );

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    const {
      username,
      displayName,
      password
    } = parsed.data;

    const normalizedUsername =
      username.toLowerCase();

    const existing =
      await prisma.user.findUnique({
        where: {
          username: normalizedUsername
        }
      });

    if (existing) {
      return reply.conflict(
        'Username is already taken'
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const user =
      await prisma.user.create({
        data: {
          username: normalizedUsername,
          displayName,
          passwordHash
        }
      });

    const token = app.jwt.sign({
      id: user.id,
      username: user.username
    });

    return reply
      .code(201)
      .send({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        }
      });
  }
);

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/auth/login',
  async (request, reply) => {
    const parsed = z
      .object({
        username: z.string(),
        password: z.string().min(1)
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          username:
            parsed.data.username.toLowerCase()
        }
      });

    if (
      !user ||
      !(await bcrypt.compare(
        parsed.data.password,
        user.passwordHash
      ))
    ) {
      return reply.unauthorized(
        'Invalid username or password'
      );
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        lastSeenAt: new Date()
      }
    });

    const token = app.jwt.sign({
      id: user.id,
      username: user.username
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      }
    };
  }
);

/* -------------------------------------------------------------------------- */
/* User Search                                                                */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/users/search',
  {
    preHandler: [app.authenticate]
  },
  async request => {
    const query = String(
      (request.query as any)?.q ?? ''
    ).trim();

    if (!query) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            displayName: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },

      select: userSelect,

      take: 20
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Conversations                                                              */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/conversations',
  {
    preHandler: [app.authenticate]
  },
  async request => {
    const { id } = authUser(request);

    return prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: id
          }
        }
      },

      orderBy: {
        updatedAt: 'desc'
      },

      include: conversationInclude
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Direct Conversation                                                        */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/conversations/direct',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id } = authUser(request);

    const parsed = z
      .object({
        userId: z.string()
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    if (parsed.data.userId === id) {
      return reply.badRequest(
        'You cannot chat with yourself'
      );
    }

    const target =
      await prisma.user.findUnique({
        where: {
          id: parsed.data.userId
        },
        select: userSelect
      });

    if (!target) {
      return reply.notFound(
        'User not found'
      );
    }

    const existing =
      await prisma.conversation.findFirst({
        where: {
          isGroup: false,

          AND: [
            {
              members: {
                some: {
                  userId: id
                }
              }
            },
            {
              members: {
                some: {
                  userId: parsed.data.userId
                }
              }
            }
          ]
        },

        include: conversationInclude
      });

    if (existing) {
      return existing;
    }

    return prisma.conversation.create({
      data: {
        creatorId: id,

        members: {
          create: [
            {
              userId: id
            },
            {
              userId: parsed.data.userId
            }
          ]
        }
      },

      include: conversationInclude
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Group Conversation                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/conversations/group',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id } = authUser(request);

    const parsed = z
      .object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(80),

        userIds: z
          .array(z.string())
          .min(1)
          .max(100)
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    const ids = [
      id,
      ...parsed.data.userIds.filter(
        userId => userId !== id
      )
    ];

    const users =
      await prisma.user.findMany({
        where: {
          id: {
            in: ids
          }
        },

        select: {
          id: true
        }
      });

    if (
      users.length !==
      new Set(ids).size
    ) {
      return reply.badRequest(
        'One or more users were not found'
      );
    }

    return prisma.conversation.create({
      data: {
        isGroup: true,
        title: parsed.data.title,
        creatorId: id,

        members: {
          create: ids.map(
            userId => ({
              userId
            })
          )
        }
      },

      include: conversationInclude
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Conversation Membership                                                    */
/* -------------------------------------------------------------------------- */

async function member(
  userId: string,
  conversationId: string
) {
  return prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/conversations/:id/messages',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id } = authUser(request);

    const conversationId =
      String(
        (request.params as any).id
      );

    const isMember =
      await member(
        id,
        conversationId
      );

    if (!isMember) {
      return reply.forbidden(
        'Not a conversation member'
      );
    }

    const limit = Math.min(
      Math.max(
        Number(
          (request.query as any)?.limit ??
            100
        ),
        1
      ),
      100
    );

    return prisma.message.findMany({
      where: {
        conversationId
      },

      orderBy: {
        createdAt: 'asc'
      },

      take: limit,

      include: messageInclude
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Read Receipts                                                              */
/* -------------------------------------------------------------------------- */


app.get(
  '/api/conversations/:id/messages/sync',
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const { id: userId } = authUser(request);
    const conversationId = String((request.params as any).id);

    if (!await member(userId, conversationId)) {
      return reply.forbidden('Not a conversation member');
    }

    const query = request.query as {
      after?: string;
      limit?: string;
    };

    const limit = Math.min(
      Math.max(Number(query.limit ?? 100), 1),
      100
    );

    let afterDate: Date | undefined;

    if (query.after) {
      const parsedDate = new Date(query.after);

      if (Number.isNaN(parsedDate.getTime())) {
        return reply.badRequest('Invalid after timestamp');
      }

      afterDate = parsedDate;
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(afterDate
          ? { createdAt: { gt: afterDate } }
          : {})
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit,
      include: messageInclude
    });

    return {
      conversationId,
      messages,
      count: messages.length,
      hasMore: messages.length === limit,
      syncedAt: new Date().toISOString()
    };
  }
);

app.post(
  '/api/conversations/:id/read',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id } = authUser(request);

    const conversationId =
      String(
        (request.params as any).id
      );

    const isMember =
      await member(
        id,
        conversationId
      );

    if (!isMember) {
      return reply.forbidden();
    }

    const at = new Date();

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: id
        }
      },

      data: {
        lastReadAt: at
      }
    });

    io
      .to(`conversation:${conversationId}`)
      .emit(
        'message:read',
        {
          conversationId,
          userId: id,
          at
        }
      );

    return {
      ok: true,
      at
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Uploads                                                                    */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/uploads',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const file =
      await request.file();

    if (!file) {
      return reply.badRequest(
        'File is required'
      );
    }

    const safe =
      path
        .basename(file.filename)
        .replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

    const name =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safe}`;

    const target =
      path.join(
        UPLOAD_DIR,
        name
      );

    await fs.writeFile(
      target,
      await file.toBuffer()
    );

    const stat =
      await fs.stat(target);

    return {
      url: `/uploads/${name}`,
      name: file.filename,
      mime: file.mimetype,
      size: stat.size
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Reactions                                                                  */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/messages/:id/reactions',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id: userId } =
      authUser(request);

    const messageId =
      String(
        (request.params as any).id
      );

    const parsed = z
      .object({
        emoji: z
          .string()
          .min(1)
          .max(16)
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    const message =
      await prisma.message.findUnique({
        where: {
          id: messageId
        }
      });

    if (
      !message ||
      !(await member(
        userId,
        message.conversationId
      ))
    ) {
      return reply.notFound(
        'Message not found'
      );
    }

    const reaction =
      await prisma.messageReaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji: parsed.data.emoji
          }
        },

        create: {
          messageId,
          userId,
          emoji: parsed.data.emoji
        },

        update: {}
      });

    io
      .to(
        `conversation:${message.conversationId}`
      )
      .emit(
        'reaction:update',
        {
          messageId,
          reaction,
          action: 'add'
        }
      );

    return reaction;
  }
);

app.delete(
  '/api/messages/:id/reactions',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id: userId } =
      authUser(request);

    const messageId =
      String(
        (request.params as any).id
      );

    const emoji =
      String(
        (request.query as any)?.emoji ??
          ''
      );

    const message =
      await prisma.message.findUnique({
        where: {
          id: messageId
        }
      });

    if (
      !message ||
      !(await member(
        userId,
        message.conversationId
      ))
    ) {
      return reply.notFound(
        'Message not found'
      );
    }

    await prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji
      }
    });

    io
      .to(
        `conversation:${message.conversationId}`
      )
      .emit(
        'reaction:update',
        {
          messageId,
          userId,
          emoji,
          action: 'remove'
        }
      );

    return {
      ok: true
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Edit Message                                                               */
/* -------------------------------------------------------------------------- */

app.patch(
  '/api/messages/:id',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id: userId } =
      authUser(request);

    const messageId =
      String(
        (request.params as any).id
      );

    const parsed = z
      .object({
        body: z
          .string()
          .trim()
          .min(1)
          .max(10000)
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.badRequest(
        JSON.stringify(parsed.error.flatten())
      );
    }

    const message =
      await prisma.message.findUnique({
        where: {
          id: messageId
        }
      });

    if (
      !message ||
      message.senderId !== userId ||
      message.deletedAt
    ) {
      return reply.notFound(
        'Message not found'
      );
    }

    const updated =
      await prisma.message.update({
        where: {
          id: messageId
        },

        data: {
          body: parsed.data.body,
          editedAt: new Date()
        },

        include: messageInclude
      });

    io
      .to(
        `conversation:${message.conversationId}`
      )
      .emit(
        'message:updated',
        updated
      );

    return updated;
  }
);

/* -------------------------------------------------------------------------- */
/* Delete Message                                                             */
/* -------------------------------------------------------------------------- */

app.delete(
  '/api/messages/:id',
  {
    preHandler: [app.authenticate]
  },
  async (request, reply) => {
    const { id: userId } =
      authUser(request);

    const messageId =
      String(
        (request.params as any).id
      );

    const message =
      await prisma.message.findUnique({
        where: {
          id: messageId
        }
      });

    if (
      !message ||
      message.senderId !== userId
    ) {
      return reply.notFound(
        'Message not found'
      );
    }

    const updated =
      await prisma.message.update({
        where: {
          id: messageId
        },

        data: {
          body: '',
          deletedAt: new Date()
        },

        include: messageInclude
      });

    io
      .to(
        `conversation:${message.conversationId}`
      )
      .emit(
        'message:deleted',
        {
          id: messageId,
          conversationId:
            message.conversationId,
          deletedAt:
            updated.deletedAt
        }
      );

    return {
      ok: true
    };
  }
);

/* -------------------------------------------------------------------------- */
/* HTTP Server                                                                */
/* -------------------------------------------------------------------------- */

await registerAdvancedRoutes(app, prisma);

const httpServer =
  await app.listen({
    port: PORT,
    host: '0.0.0.0'
  });

/* -------------------------------------------------------------------------- */
/* Socket.IO                                                                  */
/* -------------------------------------------------------------------------- */

const io = new Server(
  app.server,
  {
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Online Presence                                                            */
/* -------------------------------------------------------------------------- */

const online =
  new Map<string, number>();

/* -------------------------------------------------------------------------- */
/* Socket Authentication                                                       */
/* -------------------------------------------------------------------------- */

io.use(
  async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      socket.data.user =
        app.jwt.verify(token);

      next();
    } catch {
      next(
        new Error(
          'Invalid authentication token'
        )
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Socket Connections                                                         */
/* -------------------------------------------------------------------------- */

io.on(
  'connection',
  async socket => {
    const userId =
      socket.data.user.id as string;

    /* ------------------------------ Online -------------------------------- */

    online.set(
      userId,
      (online.get(userId) ?? 0) + 1
    );

    socket.join(
      `user:${userId}`
    );

    io.emit(
      'presence:update',
      {
        userId,
        online: true
      }
    );

    for (const [onlineUserId] of online) {
      if (onlineUserId !== userId) {
        socket.emit('presence:update', {
          userId: onlineUserId,
          online: true
        });
      }
    }

    /* ------------------------- Conversation Join -------------------------- */

    socket.on(
      'conversation:join',
      async (
        conversationId: string
      ) => {
        if (
          await member(
            userId,
            conversationId
          )
        ) {
          socket.join(
            `conversation:${conversationId}`
          );
        }
      }
    );

    socket.on('conversation:leave', (conversationId: string) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    /* ---------------------------- Typing ---------------------------------- */

    /* ------------------------- Offline Sync ------------------------------ */

    socket.on(
      'conversation:sync',
      async (
        data: {
          conversationId: string;
          after?: string;
        }
      ) => {
        try {
          if (
            !data?.conversationId ||
            !(await member(
              userId,
              data.conversationId
            ))
          ) {
            socket.emit(
              'sync:failed',
              {
                conversationId:
                  data?.conversationId,
                error:
                  'Not a conversation member'
              }
            );

            return;
          }

          let afterDate: Date | undefined;

          if (data.after) {
            const parsedDate =
              new Date(data.after);

            if (
              Number.isNaN(
                parsedDate.getTime()
              )
            ) {
              socket.emit(
                'sync:failed',
                {
                  conversationId:
                    data.conversationId,
                  error:
                    'Invalid sync timestamp'
                }
              );

              return;
            }

            afterDate = parsedDate;
          }

          const messages =
            await prisma.message.findMany({
              where: {
                conversationId:
                  data.conversationId,

                ...(afterDate
                  ? {
                      createdAt: {
                        gt: afterDate
                      }
                    }
                  : {})
              },

              orderBy: {
                createdAt: 'asc'
              },

              take: 100,

              include:
                messageInclude
            });

          socket.emit(
            'sync:messages',
            {
              conversationId:
                data.conversationId,

              messages,

              count:
                messages.length,

              syncedAt:
                new Date().toISOString(),

              hasMore:
                messages.length === 100
            }
          );
        } catch (error) {
          console.error(
            'conversation:sync failed:',
            error
          );

          socket.emit(
            'sync:failed',
            {
              conversationId:
                data?.conversationId,

              error:
                'Unable to synchronize messages'
            }
          );
        }
      }
    );

    socket.on(
      'typing',
      async data => {
        if (
          await member(
            userId,
            data.conversationId
          )
        ) {
          socket
            .to(
              `conversation:${data.conversationId}`
            )
            .emit(
              'typing',
              {
                userId,
                typing: !!data.typing
              }
            );
        }
      }
    );

    /* ------------------------- Message Send ------------------------------- */

    socket.on(
      'message:send',
      async data => {
        try {
          if (
            !data?.conversationId ||
            !data?.body?.trim()
          ) {
            socket.emit(
              'message:failed',
              {
                clientId:
                  data?.clientId,
                conversationId:
                  data?.conversationId,
                error:
                  'Message body is required'
              }
            );

            return;
          }

          const isMember =
            await member(
              userId,
              data.conversationId
            );

          if (!isMember) {
            socket.emit(
              'message:failed',
              {
                clientId:
                  data.clientId,
                conversationId:
                  data.conversationId,
                error:
                  'You are not a member of this conversation'
              }
            );

            return;
          }

          /* -------------------------- Persist ----------------------------- */

          const message =
            await prisma.message.create({
              data: {
                conversationId:
                  data.conversationId,

                senderId:
                  userId,

                body:
                  data.body.trim(),

                replyToId:
                  data.replyToId ||
                  null,

                type:
                  data.type ||
                  'text',

                attachmentUrl:
                  data.attachmentUrl ||
                  null,

                attachmentName:
                  data.attachmentName ||
                  null,

                attachmentMime:
                  data.attachmentMime ||
                  null,

                attachmentSize:
                  data.attachmentSize ||
                  null
              },

              include:
                messageInclude
            });

          /* ---------------------- Update Conversation --------------------- */

          await prisma.conversation.update({
            where: {
              id:
                data.conversationId
            },

            data: {
              updatedAt:
                new Date()
            }
          });

          /* ----------------------- Broadcast Message ---------------------- */

          io
            .to(
              `conversation:${data.conversationId}`
            )
            .emit(
              'message:new',
              {
                ...message,

                clientId:
                  data.clientId
              }
            );

          /* ---------------------- Delivery Ack ---------------------------- */

          io
            .to(
              `user:${userId}`
            )
            .emit(
              'message:delivered',
              {
                messageId:
                  message.id,

                conversationId:
                  message.conversationId,

                clientId:
                  data.clientId,

                deliveredAt:
                  new Date().toISOString()
              }
            );
        } catch (error) {
          console.error(
            'message:send failed:',
            error
          );

          /* ---------------------- Failure Ack ---------------------------- */

          socket.emit(
            'message:failed',
            {
              clientId:
                data?.clientId,

              conversationId:
                data?.conversationId,

              error:
                'Unable to send message'
            }
          );
        }
      }
    );

    /* ----------------------------- Disconnect ----------------------------- */

    socket.on(
      'disconnect',
      async () => {
        const count =
          (online.get(userId) ?? 1) -
          1;

        if (count <= 0) {
          online.delete(userId);

          await prisma.user
            .update({
              where: {
                id: userId
              },

              data: {
                lastSeenAt:
                  new Date()
              }
            })
            .catch(() => {});

          io.emit(
            'presence:update',
            {
              userId,
              online: false
            }
          );
        } else {
          online.set(
            userId,
            count
          );
        }
      }
    );
  }
);

/* -------------------------------------------------------------------------- */
/* Startup                                                                    */
/* -------------------------------------------------------------------------- */

app.log.info(
  `Global Messenger API listening at ${httpServer}`
);
