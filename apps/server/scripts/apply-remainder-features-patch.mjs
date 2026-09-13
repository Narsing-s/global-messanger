import fs from 'node:fs';
import path from 'node:path';

const advanced = path.resolve(process.cwd(), 'src/advanced.ts');
if (!fs.existsSync(advanced)) process.exit(0);
let text = fs.readFileSync(advanced, 'utf8');
const importLine = "import { registerRemainderFeatures } from './remainder-features.js';";
if (!text.includes(importLine)) {
  text = text.replace("import { registerActivityCenter } from './activity-center.js';", "import { registerActivityCenter } from './activity-center.js';\n" + importLine);
}
if (!text.includes('await registerRemainderFeatures(app, prisma);')) {
  text = text.replace('await registerActivityCenter(app, prisma);', 'await registerActivityCenter(app, prisma);\n  await registerRemainderFeatures(app, prisma);');
}
// Privacy settings are already registered by product-center.ts. Keep the remainder
// module focused on the additional security/profile/block/organization APIs.
text = text.replace(/\n  app\.patch\('\/api\/privacy\/settings'[\s\S]*?\n  app\.get\('\/api\/blocked'/, "\n  app.get('/api/blocked'");
fs.writeFileSync(advanced, text);
