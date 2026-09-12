# Global Messenger — Production Readiness

This document defines the minimum operation coverage required before calling a release production-ready.

## Core operations

- [ ] Register with validation and duplicate-user handling
- [ ] Login with username/email and invalid-credential handling
- [ ] Logout and local-session cleanup
- [ ] Forgot-password and reset-password flow
- [ ] Search users and open a direct conversation
- [ ] Create a group with a title and selected members
- [ ] Load conversation history with loading and error states
- [ ] Send text messages with delivery failure feedback
- [ ] Receive realtime messages without duplicates
- [ ] Show typing and online presence accurately
- [ ] Edit own messages and show edited state
- [ ] Delete own messages and show deleted state
- [ ] Reply to a message and preserve reply reference
- [ ] React to a message and update the reaction state
- [ ] Upload image/file attachments with size/type errors
- [ ] Voice-call and video-call entry points
- [ ] Push notification registration and permission denial fallback
- [ ] End-to-end encryption key bootstrap and unavailable-key handling
- [ ] Responsive desktop, tablet, and mobile navigation

## Release gates

1. `npm run validate:operations` passes.
2. `npm run build` passes with no TypeScript errors.
3. Browser smoke tests cover authentication, chat creation, sending, editing, deleting, replying, reactions, attachments, and logout.
4. Backend integration tests cover authorization, validation, persistence, realtime events, and failure responses.
5. A staging deployment is tested with real database, object storage, mail, and Socket.IO configuration.
6. No secrets are committed; production CORS, cookies/tokens, rate limits, upload limits, and security headers are verified.

## Important

Static operation validation confirms that UI/API wiring exists. It does **not** prove that a live deployment, database, realtime server, encryption setup, or third-party provider is healthy. Those require staging or production integration tests with configured services.
