import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const main = await read('src/main.tsx');
const api = await read('src/api.ts');

async function collect(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'android', 'ios'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path, files);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const webFiles = await collect(fileURLToPath(new URL('../src/', import.meta.url)));
const webSource = (await Promise.all(webFiles.map(file => readFile(file, 'utf8')))).join('\n');
const serverFiles = await collect(fileURLToPath(new URL('../../server/src/', import.meta.url)));
const server = (await Promise.all(serverFiles.map(file => readFile(file, 'utf8')))).join('\n');

const requiredUi = [
  ['authentication', /\/api\/auth\//],
  ['user search', /searchUsers/],
  ['direct chat creation', /api\.direct/],
  ['group creation', /api\.group/],
  ['message send', /message:send/],
  ['message receive', /message:new/],
  ['message reply', /replyToId/],
  ['message edit', /api\.editMessage/],
  ['message delete', /api\.deleteMessage/],
  ['forward', /api\.forwardMessage/],
  ['pin', /api\.pin/],
  ['unpin', /api\.unpin/],
  ['bookmark', /api\.bookmark/],
  ['unbookmark', /api\.unbookmark/],
  ['reaction', /api\.react/],
  ['upload', /api\.upload/],
  ['emoji picker', /EMOJIS/],
  ['typing indicator', /typing/],
  ['read receipts', /message:read/],
  ['voice call action', /type:'audio'/],
  ['video call action', /type:'video'/],
  ['logout', /localStorage\.clear\(\)/],
  ['push notifications', /initPushNotifications/],
  ['offline outbox', /queueMessage|readOutbox/]
];

const requiredAdvanced = [
  ['bulk delete', /\/api\/messages\/bulk-delete/],
  ['bulk forward', /\/api\/messages\/bulk-forward/],
  ['message search', /\/api\/messages\/search/],
  ['poll create', /\/api\/polls/],
  ['poll vote', /\/api\/polls\/.*vote/],
  ['scheduled messages', /\/api\/messages\/schedule/],
  ['location message', /\/api\/messages\/location/],
  ['live location', /\/api\/messages\/live-location/],
  ['contact sharing', /\/api\/messages\/contact/],
  ['event sharing', /\/api\/messages\/event/],
  ['2FA', /\/api\/security\/2fa/],
  ['login history', /\/api\/security\/login-history/],
  ['device security', /\/api\/security\/device-key/],
  ['E2EE identity', /\/api\/crypto\/identity/],
  ['AI assistant', /\/api\/ai\//],
  ['session security', /\/api\/account\/sessions/],
  ['product center', /\/api\/product\/features/]
];

const failures = requiredUi.filter(([, pattern]) => !pattern.test(main) && !pattern.test(api) && !pattern.test(webSource));
const advancedFailures = requiredAdvanced.filter(([, pattern]) => !pattern.test(main) && !pattern.test(api) && !pattern.test(webSource) && !pattern.test(server));

const requiredApiMethods = [
  'searchUsers', 'conversations', 'direct', 'group', 'messages', 'syncMessages', 'unread', 'read',
  'chatInfo', 'pins', 'pin', 'unpin', 'searchMessages', 'profile', 'updateProfile', 'renameGroup',
  'addGroupMember', 'removeGroupMember', 'forwardMessage', 'editMessage', 'deleteMessage', 'upload',
  'react', 'unreact', 'bookmark', 'unbookmark', 'registerDevice', 'aiAssist'
];
const missingApiMethods = requiredApiMethods.filter(name => !new RegExp(`\\b${name}\\s*:`).test(api));

const paths = [...api.matchAll(/['\"](\/api\/[^'\"`$]+)['\"`]/g)].map(m => m[1]);
const uniquePaths = [...new Set(paths)];
const routeMisses = uniquePaths.filter(path => {
  const pieces = path.split('/').filter(Boolean);
  const stable = '/' + pieces.slice(0, Math.min(3, pieces.length)).join('/');
  return !server.includes(path) && !server.includes(stable);
});

if (failures.length || advancedFailures.length || missingApiMethods.length || routeMisses.length) {
  console.error('Operation contract validation FAILED.');
  if (failures.length) {
    console.error('\nMissing core UI wiring:');
    for (const [name] of failures) console.error(`- ${name}`);
  }
  if (advancedFailures.length) {
    console.error('\nMissing advanced server/UI contract:');
    for (const [name] of advancedFailures) console.error(`- ${name}`);
  }
  if (missingApiMethods.length) {
    console.error(`\nMissing API client methods: ${missingApiMethods.join(', ')}`);
  }
  if (routeMisses.length) {
    console.error('\nAPI paths with no matching server route prefix:');
    for (const path of routeMisses) console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log(`Operation contract validation passed: ${requiredUi.length} core UI capabilities, ${requiredAdvanced.length} advanced contracts, ${requiredApiMethods.length} API methods, and ${uniquePaths.length} API path contracts checked.`);
