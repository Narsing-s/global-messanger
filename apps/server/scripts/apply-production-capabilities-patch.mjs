import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const advanced = path.resolve(root, 'src/advanced.ts');
const capability = path.resolve(root, 'src/production-capabilities.ts');

if (fs.existsSync(capability)) {
  let s = fs.readFileSync(capability, 'utf8');
  s = s.replace("import { promisify } from 'node:util';\n", '');
  s = s.replace("\nconst execFile = promisify(spawn);\n", '\n');
  s = s.replace("const filename=path.join(dir(),`${crypto.randomUUID()}-${path.basename(file.filename)}`);", "const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`);");
  if (!s.includes("const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`);")) {
    s = s.replace(/const filename=path\.join\(dir\(\),/, 'const filename=path.join(dir,');
  }
  fs.writeFileSync(capability, s);
}

if (fs.existsSync(advanced)) {
  let s = fs.readFileSync(advanced, 'utf8');
  const importLine = "import { registerProductionCapabilities } from './production-capabilities.js';";
  if (!s.includes(importLine)) {
    s = s.replace("import { registerGlobalMarketPlatform } from './global-market-platform.js';", "import { registerGlobalMarketPlatform } from './global-market-platform.js';\n" + importLine);
  }
  if (!s.includes('await registerProductionCapabilities(app, prisma);')) {
    s = s.replace('await registerGlobalMarketPlatform(app, prisma);', 'await registerGlobalMarketPlatform(app, prisma);\n  await registerProductionCapabilities(app, prisma);');
  }
  fs.writeFileSync(advanced, s);
}
