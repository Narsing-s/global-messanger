import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patch(file, replacements) {
  const full = path.join(root, file);
  let source = fs.readFileSync(full, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[harden] pattern not found: ${file}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(full, source, 'utf8');
    console.log(`[harden] patched ${file}`);
  }
}

// Keep the previous chat rendered while the next conversation is loading.
// This prevents a transient empty React tree/white screen during rapid chat switching.
patch('apps/web/src/main.tsx', [
  [
    'const requestId=++messageRequest.current;setMessages([]);setOtherTyping(false);',
    'const requestId=++messageRequest.current;setOtherTyping(false);'
  ]
]);

// When a new socket connects, send it a snapshot of users already online.
// Without this, the second logged-in user only receives future presence changes.
patch('apps/server/src/index.ts', [
  [
    "    io.emit(\n      'presence:update',\n      {\n        userId,\n        online: true\n      }\n    );",
    "    io.emit(\n      'presence:update',\n      {\n        userId,\n        online: true\n      }\n    );\n\n    for (const [onlineUserId] of online) {\n      if (onlineUserId !== userId) {\n        socket.emit('presence:update', {\n          userId: onlineUserId,\n          online: true\n        });\n      }\n    }"
  ]
]);

console.log('[harden] runtime hardening complete');
