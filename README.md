# Global Messenger

A modern, privacy-conscious global messaging platform built for fast realtime conversations.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Fastify
- Realtime: Socket.IO
- Database: PostgreSQL + Prisma
- Authentication: JWT + bcrypt
- Styling: CSS with responsive dark/light UI

## Monorepo

```text
apps/
  web/        React client
  server/     Fastify API + Socket.IO
prisma/       Database schema
```

## Development

```bash
npm install
cp apps/server/.env.example apps/server/.env
npm run db:generate
npm run dev
```

The web app runs on port 5173 and the API on port 4000.

## Product principles

- Realtime first
- Mobile and desktop friendly
- Usernames instead of requiring phone numbers
- Secure authentication and authorization
- Designed for internationalization
- Extensible architecture for translation, voice, media, groups and AI assistance
