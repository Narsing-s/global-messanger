import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/advanced.ts');
if (!fs.existsSync(file)) process.exit(0);
let text = fs.readFileSync(file, 'utf8');
const importLine = "import { registerPhase1Routes } from './phase1-completeness.js';";
if (!text.includes(importLine)) {
  text = `${text.replace(/\r?\n/, `\n${importLine}\n`)}`;
}
const anchor = 'await registerAdvancedFeatures(app, prisma);';
if (!text.includes('await registerPhase1Routes(app, prisma);')) {
  if (!text.includes(anchor)) throw new Error('Phase 1 patch anchor not found in advanced.ts');
  text = text.replace(anchor, `${anchor}\n  await registerPhase1Routes(app, prisma);`);
}
fs.writeFileSync(file, text);
