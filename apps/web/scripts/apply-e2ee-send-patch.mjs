import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
let source=fs.readFileSync(file,'utf8');
const marker='// e2ee-send-v1';
if(!source.includes(marker)){
  if(!source.includes("from './e2ee'")){
    const apiImport=source.match(/import\s*\{\s*api,\s*API\s*\}\s*from\s*['\"]\.\/api['\"];?/);
    if(apiImport) source=source.replace(apiImport[0],`${apiImport[0]}\nimport { encryptMessage } from './e2ee';`);
    else throw new Error('E2EE send patch: API import anchor not found');
  }
  const old="  function send(){const body=text.trim();if(!body||!active)return;";
  if(!source.includes(old)) throw new Error('E2EE send patch: send anchor not found');
  source=source.replace(old,"  async function send(){const body=text.trim();if(!body||!active)return;");
  const oldEmit="socket.emit('message:send',{conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});";
  if(!source.includes(oldEmit)) throw new Error('E2EE send patch: message emit anchor not found');
  source=source.replace(oldEmit,"const encryptedBody=await encryptMessage(String(active.id),body);socket.emit('message:send',{conversationId:active.id,body:encryptedBody,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});");
  source=source.replace("  async function sendFile(file:File){","  async function sendFile(file:File){");
  source=source.replace(/\n  async function send\(\)/,`\n  ${marker}\n  async function send()`);
  fs.writeFileSync(file,source);
  console.log('E2EE send patch applied');
}
