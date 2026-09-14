import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/components/CompleteOperationsCenter.tsx',
  'src/components/ProductCenter.tsx',
  'src/api.ts',
  'src/services/advanced-api.ts'
];
for (const file of required) {
  if (!fs.existsSync(path.resolve(root, file))) throw new Error(`[complete-operations] missing ${file}`);
}
const suite = fs.readFileSync(path.resolve(root, 'src/components/CompleteOperationsCenter.tsx'), 'utf8');
const operations = [
  'Global people','Bulk delete','Bulk forward','Favorites','Pinned chats','Archive','Unread',
  'Refresh media','Notification center','Change password','2FA status','Passkeys','Active devices',
  'Blocked users','Polls','Scheduled messages','Location','Live location','Contact','Event',
  'Conversation summary','Document understanding','Smart notifications','Larger text','Reduced motion',
  'Export account','Export media','Block user','Report','Developer platform'
];
for (const operation of operations) if (!suite.includes(operation)) throw new Error(`[complete-operations] missing UI operation: ${operation}`);
console.log(`[complete-operations] validated ${operations.length} product operations`);
