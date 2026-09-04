# About Global Messenger

## What is Global Messenger?

Global Messenger is a privacy-focused, realtime messaging platform for web and Android. It is designed to provide a modern messaging experience while keeping conversation history under the user's control.

The application combines one-to-one messaging, group conversations, profiles, media sharing, notifications, realtime delivery, account recovery, and an Android experience in one shared product.

## Core capabilities

- One-to-one and group chats
- Realtime messaging with Socket.IO
- User profiles, avatars, online status, and last seen
- Replies, reactions, editing, and pinned messages
- Delete for me and delete for everyone where supported
- Manual chat clearing — never automatic chat clearing
- Image and file sharing
- Bookmarks and pinned messages
- Notifications and notification sounds
- User blocking and conversation controls
- Voice/video calling foundation using WebRTC
- JWT authentication with bcrypt password hashing
- Email-based password recovery
- Android application powered by Capacitor
- Optional AI assistance without making AI a requirement for core messaging
- Dedicated Help Centre with support requests and request-status tracking

## Product principles

### User-controlled conversations

Messages and chats are not silently cleared by the application. Users decide when to delete or clear conversation content.

### Realtime first

The messaging layer is designed around realtime communication, reconnect handling, and message synchronization so temporary network interruptions do not unnecessarily break the conversation experience.

### Secure by design

Authentication, password hashing, authorization, validation, restricted production CORS, and secret-based configuration are used throughout the application. Production credentials and tokens belong in environment variables, never in Git.

### Web + Android

The same product is delivered to browsers and Android through the shared TypeScript application and Capacitor Android project.

## Technology

- React + TypeScript + Vite
- Node.js + Fastify + TypeScript
- Socket.IO
- PostgreSQL + Prisma
- JWT + bcrypt
- WebRTC foundation
- Capacitor + Android
- Docker Compose for local development
- Render for the current deployment setup

## Help Centre

The Help Centre provides searchable/common answers, a voice-enabled help assistant, support-request submission, and support-request status tracking. Support requests are stored by the backend and receive a permanent request ID.

If a support request is saved but email notification delivery temporarily fails, the request remains stored so it is not lost.

## Project goal

The goal of Global Messenger is to provide a dependable, modern messaging product that can grow from a personal/open-source project into a production-quality communication platform without sacrificing user control over conversations.
