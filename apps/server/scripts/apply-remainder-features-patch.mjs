import fs from 'node:fs';
import path from 'node:path';

const advanced = path.resolve(process.cwd(), 'src/advanced.ts');
if (fs.existsSync(advanced)) {
  let text = fs.readFileSync(advanced, 'utf8');
  const importLine = "import { registerRemainderFeatures } from './remainder-features.js';";
  if (!text.includes(importLine)) {
    text = text.replace("import { registerActivityCenter } from './activity-center.js';", "import { registerActivityCenter } from './activity-center.js';\n" + importLine);
  }
  if (!text.includes('await registerRemainderFeatures(app, prisma);')) {
    text = text.replace('await registerActivityCenter(app, prisma);', 'await registerActivityCenter(app, prisma);\n  await registerRemainderFeatures(app, prisma);');
  }
  fs.writeFileSync(advanced, text);
}

const remainder = path.resolve(process.cwd(), 'src/remainder-features.ts');
if (fs.existsSync(remainder)) {
  let text = fs.readFileSync(remainder, 'utf8');
  // Already implemented elsewhere; remove duplicates so Fastify never registers a route twice.
  text = text.replace(/\n  app\.patch\('\/api\/privacy\/settings'[\s\S]*?\n  app\.get\('\/api\/blocked'/, "\n  app.get('/api/blocked'");
  text = text.replace(/\n  app\.post\('\/api\/messages\/bulk-delete'[\s\S]*?\n  app\.post\('\/api\/messages\/bulk-forward'/, "\n  app.post('/api/messages/bulk-forward'");
  text = text.replace(/\n  \/\* ----------------------------- polls \/ schedule ------------------------- \*\/[\s\S]*?\n  \/\* ------------------------------ universal search ------------------------- \*\//, "\n  /* ------------------------------ universal search ------------------------- */");
  fs.writeFileSync(remainder, text);
}
