# Architecture

```text
Browser / Android app
        │ HTTPS / WSS
        ▼
React + Vite client
        │ REST + Socket.IO
        ▼
Fastify API + realtime server
        │
        ├── Authentication
        ├── Conversations
        ├── Messages
        ├── Calls/signaling
        ├── Uploads
        └── Notifications/events
        │
        ▼
PostgreSQL + Prisma
```

## Frontend

The React client handles authentication, conversation state, message rendering, emoji/reactions, file selection, call UI and realtime events.

## Backend

Fastify exposes HTTP APIs and Socket.IO handles realtime message/call events. Authentication uses JWT and passwords are hashed with bcrypt.

## Calls

WebRTC carries audio/video between clients. Socket.IO is used for signaling. Production calling should use secure HTTPS/WSS and a reliable STUN/TURN setup.

## Media

Uploads should use controlled file size/type validation and durable object storage in production. Do not store secrets or credentials in the client bundle.

## Scaling

For a larger deployment, separate web/API/media services, add a shared Socket.IO adapter such as Redis, use object storage/CDN for media and add centralized logs/metrics.
