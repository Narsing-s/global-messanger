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

const serverRoot = fileURLToPath(new URL('../../server/src/', import.meta.url));
const serverFiles = await collect(serverRoot);
const server = (await Promise.all(serverFiles.map(file => readFile(file, 'utf8')))).join('\n');

const requiredUi = [
  ['authentication', /\/api\/auth\//],
  ['user search', /searchUsers/],
  ['direct chat creation', /api\.direct/],
  ['group creation', /api\.group/],
  ['message send', /message:send/],
  ['message edit', /api\.editMessage/],
  ['message delete', /api\.deleteMessage/],
  ['message reply', /replyToId/],
  ['forward', /api\.forwardMessage/],
  ['pin', /api\.pin/],
  ['unpin', /api\.unpin/],
  ['bookmark', /api\.bookmark/],
  ['unbookmark', /api\.unbookmark/],
  ['reaction', /api\.react/],
  ['upload', /api\.upload/],
  ['emoji picker', /EMOJIS/],
  ['typing indicator', /typing/],
  ['voice call action', /type:'audio'/],
  ['video call action', /type:'video'/],
  ['logout', /localStorage\.clear\(\)/],
  ['push notifications', /initPushNotifications/]
];

const failures = requiredUi.filter(([, pattern]) => !pattern.test(main) && !pattern.test(api));

const requiredApiMethods = [
  'searchUsers', 'conversations', 'direct', 'group', 'messages', 'syncMessages', 'unread', 'read',
  'chatInfo', 'pins', 'pin', 'unpin', 'searchMessages', 'profile', 'updateProfile', 'renameGroup',
  'addGroupMember', 'removeGroupMember', 'forwardMessage', 'editMessage', 'deleteMessage', 'upload',
  'react', 'unreact', 'bookmark', 'unbookmark', 'registerDevice', 'aiAssist'
];
const missingApiMethods = requiredApiMethods.filter(name => !new RegExp(`\\b${name}\\s*:`).test(api));

// Check static API paths and stable prefixes against the server source. Dynamic IDs are
// intentionally ignored because their values cannot be known at build time.
const paths = [...api.matchAll(/['\"](\/api\/[^'\"`$]+)['\"`]/g)].map(m => m[1]);
const uniquePaths = [...new Set(paths)];
const routeMisses = uniquePaths.filter(path => {
  const pieces = path.split('/').filter(Boolean);
  const stable = '/' + pieces.slice(0, Math.min(3, pieces.length)).join('/');
  return !server.includes(path) && !server.includes(stable);
});

if (failures.length || missingApiMethods.length || routeMisses.length) {
  console.error('Operation contract validation FAILED.');
  if (failures.length) {
    console.error('\nMissing UI wiring:');
    for (const [name] of failures) console.error(`- ${name}`);
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

console.log(`Operation contract validation passed: ${requiredUi.length} UI capabilities, ${requiredApiMethods.length} API methods, and ${uniquePaths.length} API path contracts checked.`);
