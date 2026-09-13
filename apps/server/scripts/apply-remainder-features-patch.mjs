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
// These routes already exist in product-center / phase1-completeness / advanced-platform.
text = text.replace(/\n  app\.patch\('\/api\/privacy\/settings'[\s\S]*?\n  app\.get\('\/api\/blocked'/, "\n  app.get('/api/blocked'");
text = text.replace(/\n  app\.post\('\/api\/messages\/bulk-delete'[\s\S]*?\n  app\.post\('\/api\/messages\/bulk-forward'/, "\n  app.post('/api/messages/bulk-forward'");
text = text.replace(/\n  \/\* ----------------------------- polls \/ schedule ------------------------- \*\/[\s\S]*?\n  \/\* ------------------------------ universal search ------------------------- \*\//, "\n  /* ------------------------------ universal search ------------------------- */");
fs.writeFileSync(advanced, text);
