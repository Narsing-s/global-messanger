# Getting Started

## Goal

Run Global Messenger locally and verify the basic realtime messaging flow.

## Prerequisites

1. Node.js 20+ recommended.
2. npm.
3. PostgreSQL or Docker Desktop.
4. Git.

## Setup

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
npm install
```

Create the server environment file from the example and configure the database, JWT secret and production-safe origins.

```bash
cp apps/server/.env.example apps/server/.env
npm run db:generate
npm run dev
```

Open the web application on the port printed by Vite, normally `http://localhost:5173`.

## Two-account test

Use two browser profiles or one normal browser plus an incognito window. Register Account A and Account B, search for the other account and start a direct conversation.

Test sending, receiving, typing indicators, emoji, files, replies, edit/delete rules and calls.

## Troubleshooting

### Messages do not send

Check that the API is running and that Socket.IO connects successfully. Inspect browser DevTools Console and Network tabs.

### Calls fail

Use HTTPS in production and verify camera/microphone permissions. For users behind restrictive NAT/firewalls, configure a production TURN service in addition to STUN.

### Sounds do not play

Browsers require user interaction before audio can play. Click or press a key in the Messenger before testing notification, typing or ringtone audio.
