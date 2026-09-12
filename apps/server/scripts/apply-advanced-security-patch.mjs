import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/advanced.ts');
if (!fs.existsSync(file)) process.exit(0);
let text = fs.readFileSync(file, 'utf8');
const importLine = "import { registerSecurityAuth } from './security-auth.js';";
if (!text.includes(importLine)) {
  text = text.replace("import { registerAdvancedPlatform } from './advanced-platform.js';", "import { registerAdvancedPlatform } from './advanced-platform.js';\n" + importLine);
}
if (!text.includes('await registerSecurityAuth(app, prisma);')) {
  text = text.replace('await registerAdvancedPlatform(app, prisma);', 'await registerAdvancedPlatform(app, prisma);\n  await registerSecurityAuth(app, prisma);');
}
fs.writeFileSync(file, text);
