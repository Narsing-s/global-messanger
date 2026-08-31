# Testing & QA

## Smoke test

1. Register two accounts.
2. Login from two separate browser sessions.
3. Search and start a direct chat.
4. Send text and emoji.
5. Verify realtime receipt.
6. Type from the second account and verify typing indicator/sound.
7. Send an image/file.
8. Reply and react.
9. Edit a recent message.
10. Delete for everyone and verify both clients update.
11. Test an older message and confirm the everyone option is unavailable.
12. Start a voice call.
13. Start a video call.
14. Accept/decline/end calls.
15. Toggle mic/camera and verify remote behavior.
16. Confirm call log is written to the chat.
17. Change profile photo and test Cancel/Close.
18. Export a chat backup.
19. Clear the chat view.
20. Logout/login again.

## Browser checks

- Chrome/Edge current release
- Mobile Chrome
- Camera permission allowed/denied
- Microphone permission allowed/denied
- HTTPS/WSS production environment
- Network reconnect after temporary offline state

## Release gate

Do not publish if login, message delivery, calling, account deletion, privacy controls or data handling are broken.
