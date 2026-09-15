import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
let source=fs.readFileSync(file,'utf8');
const marker='// e2ee-send-v3';
if(!source.includes(marker)){
  if(!source.includes("from './e2ee'")){
    const apiImport=source.match(/import\s*\{\s*api,\s*API\s*\}\s*from\s*['\"]\.\/api['\"];?/);
    if(apiImport) source=source.replace(apiImport[0],`${apiImport[0]}\nimport { encryptMessage } from './e2ee';`);
    else throw new Error('E2EE send patch: API import anchor not found');
  }

  // The durable offline-outbox patch runs before this patch and may change the
  // send function shape. Encrypt the payload at the final message boundary so
  // both online and queued messages carry the same ciphertext.
  if(!source.includes('const encryptedBody=await encryptMessage(String(active.id),body);')){
    const queuedAnchor="const clientId=crypto.randomUUID();const queued={conversationId:active.id,body,type:'text'";
    if(source.includes(queuedAnchor)){
      source=source.replace(queuedAnchor,"const encryptedBody=await encryptMessage(String(active.id),body);const clientId=crypto.randomUUID();const queued={conversationId:active.id,body:encryptedBody,type:'text'");
      source=source.replace('  function send(){','  async function send(){');
    } else {
      const socketAnchor="socket.emit('message:send',{conversationId:active.id,body,type:'text'";
      if(!source.includes(socketAnchor)) throw new Error('E2EE send patch: message send anchor not found');
      source=source.replace('  function send(){','  async function send(){');
      source=source.replace(socketAnchor,"const encryptedBody=await encryptMessage(String(active.id),body);socket.emit('message:send',{conversationId:active.id,body:encryptedBody,type:'text'");
    }
  }

  source=source.replace(/\n  async function send\(\)/,`\n  ${marker}\n  async function send()`);
  fs.writeFileSync(file,source);
  console.log('E2EE send patch v3 applied');
}