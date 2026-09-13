import fs from 'node:fs';
import path from 'node:path';

const webRoot = process.cwd();
const stamp = `release-${new Date().toISOString().slice(0,10).replaceAll('-','')}-v14`;

for (const relative of ['index.html','public/sw.js']) {
  const file = path.resolve(webRoot, relative);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/release-\d{8}-v\d+/g, stamp);
  source = source.replace(/global-messenger-shell-v\d+/g, 'global-messenger-shell-v14');
  fs.writeFileSync(file, source);
}
console.log(`[release] cache version ${stamp}`);
