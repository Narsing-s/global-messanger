import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes("import './features';")) {
  source = source.replace(
    "import { initPushNotifications } from './push';",
    "import { initPushNotifications } from './push';\nimport './features';\nimport './advanced-ui';"
  );
}

if (!source.includes('__gmConversations')) {
  source = source.replace(
    "api.conversations().then(data=>setChats(Array.isArray(data)?data:[])).catch(e=>setSocketError(e.message||'Unable to load conversations'));",
    "api.conversations().then(data=>{const list=Array.isArray(data)?data:[];setChats(list);(window as any).__gmConversations=list}).catch(e=>setSocketError(e.message||'Unable to load conversations'));"
  );
}

fs.writeFileSync(file, source);
console.log('[Production] messenger capabilities activated');
