import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const webRoot = process.cwd();
for (const script of ['apply-production-feature-activation.mjs','apply-chat-workspace-patch.mjs','apply-cross-device-auth-patch.mjs','apply-chat-workspace-styles.mjs']) {
  const target = path.resolve(webRoot, 'scripts', script);
  if (fs.existsSync(target)) execFileSync(process.execPath, [target], { stdio: 'inherit' });
}

const stamp = `release-${new Date().toISOString().slice(0,10).replaceAll('-','')}-v19`;

for (const relative of ['index.html','public/sw.js']) {
  const file = path.resolve(webRoot, relative);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/release-\d{8}-v\d+/g, stamp);
  source = source.replace(/global-messenger-shell-v\d+/g, 'global-messenger-shell-v19');
  fs.writeFileSync(file, source);
}
console.log(`[release] cache version ${stamp}`);
