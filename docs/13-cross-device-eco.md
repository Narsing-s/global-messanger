# Cross-device parity + Eco Mode

Global Messenger should behave as one product on Web, PWA and Android. A user must not lose an operation because the UI is running inside Capacitor instead of a browser.

## Self-hosted deployment contract

Global Messenger is designed to run from infrastructure controlled by the operator. The browser uses same-origin `/api`, `/socket.io` and `/uploads` routes; there is no required hosted API, hosted database or provider-specific API URL.

The canonical deployment is the repository's Docker stack:

```text
Public domain / LAN address
        |
        v
   Web / reverse proxy
        |
        v
   Fastify + Socket.IO
        |
        v
   PostgreSQL container
```

Client code must not fall back to Render, Vercel, Cloudflare Workers, Neon or other hosted API/database endpoints.

## Device parity contract

| Capability | Web | Android | Required behavior |
|---|---|---|---|
| Login/register | Yes | Yes | Same API and validation |
| Direct chat | Yes | Yes | Same conversation ID and history |
| Group chat | Yes | Yes | Same membership and permissions |
| Realtime | Yes | Yes | Socket.IO reconnect + room rejoin |
| Send/edit/delete | Yes | Yes | Same server authorization |
| Reactions/bookmarks/pins | Yes | Yes | Same server state |
| Search | Yes | Yes | Same results |
| Media upload | Yes | Yes | Same endpoint + progress |
| Notifications | Yes | Yes | Device-specific delivery, same message source |
| Privacy/sessions | Yes | Yes | Same account state |
| E2EE | Yes | Yes | Same key/identity protocol; never render ciphertext |

## Eco Mode

Eco Mode is a user-controlled low-bandwidth/low-power profile. It should:

- avoid unnecessary polling and duplicate API requests;
- prefer Socket.IO realtime events and reconnect backoff;
- lazy-load images and media;
- disable automatic video playback;
- avoid downloading full-resolution media until opened;
- reduce animation when enabled;
- cache static application assets locally;
- batch non-urgent synchronization;
- show media size before download where practical;
- never weaken encryption, authorization or message delivery guarantees.

Eco Mode must never silently delete history or change message semantics.

## Release gate

Before releasing a web build or APK, test two real accounts on two separate devices/networks:

1. Register/login on device A.
2. Register/login on device B.
3. Search each user from the other device.
4. Start a direct chat.
5. Send text in both directions.
6. Verify delivery/read state in both directions.
7. Reply, edit, delete, react, pin, bookmark and forward.
8. Upload/download an image and document.
9. Kill and reopen the app; verify history and realtime reconnect.
10. Test notification delivery while the app is backgrounded.
11. Create a group, change membership and verify permissions.
12. Verify logout/session revocation from another device.
13. Verify E2EE identity/key behavior on both devices.
14. Test poor-network/offline recovery.
15. Repeat the core journey with Eco Mode enabled.

A build is not release-ready merely because TypeScript, Vite or Gradle succeeds.
