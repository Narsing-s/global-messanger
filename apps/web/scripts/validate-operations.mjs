import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8');

const required = [
  ['authentication', /\/api\/auth\//],
  ['user search', /searchUsers/],
  ['direct chat creation', /api\.direct/],
  ['group creation', /api\.group/],
  ['message send', /message:send/],
  ['message edit', /api\.editMessage/],
  ['message delete', /api\.deleteMessage/],
  ['message reply', /replyToId/],
  ['file upload', /api\.upload/],
  ['emoji picker', /EMOJIS/],
  ['typing indicator', /typing/],
  ['voice call action', /type:'audio'/],
  ['video call action', /type:'video'/],
  ['logout', /localStorage\.clear\(\)/],
  ['push notifications', /initPushNotifications/]
];

const failures = required.filter(([, pattern]) => !pattern.test(main) && !pattern.test(api));
if (failures.length) {
  console.error('Missing operation wiring:');
  for (const [name] of failures) console.error(`- ${name}`);
  process.exit(1);
}

const apiMethods = ['conversations', 'messages', 'read', 'searchUsers', 'direct', 'group', 'upload', 'editMessage', 'deleteMessage', 'react', 'aiAssist'];
const missingApiMethods = apiMethods.filter((name) => !new RegExp(`\\b${name}\\s*[:=]`).test(api) && !new RegExp(`\\b${name}\\s*\\(`).test(api));
if (missingApiMethods.length) {
  console.error(`API methods not found: ${missingApiMethods.join(', ')}`);
  process.exit(1);
}

console.log(`Operation validation passed: ${required.length} UI capabilities and ${apiMethods.length} API methods checked.`);
