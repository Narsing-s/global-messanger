import fs from 'node:fs';
import path from 'node:path';

const advanced=path.resolve(process.cwd(),'src/advanced.ts');
if(fs.existsSync(advanced)){
  let text=fs.readFileSync(advanced,'utf8');
  const importLine="import { registerSecurityAuth } from './security-auth.js';";
  if(!text.includes(importLine))text=text.replace("import { registerAdvancedPlatform } from './advanced-platform.js';","import { registerAdvancedPlatform } from './advanced-platform.js';\n"+importLine);
  if(!text.includes('await registerSecurityAuth(app, prisma);'))text=text.replace('await registerAdvancedPlatform(app, prisma);','await registerAdvancedPlatform(app, prisma);\n  await registerSecurityAuth(app, prisma);');
  fs.writeFileSync(advanced,text);
}

const platform=path.resolve(process.cwd(),'src/advanced-platform.ts');
if(fs.existsSync(platform)){
  let text=fs.readFileSync(platform,'utf8');
  const importLine="import { enableTotpWithRecoveryCodes } from './security-auth.js';";
  if(!text.includes(importLine))text=text.replace("import crypto from 'node:crypto';","import crypto from 'node:crypto';\n"+importLine);
  const old="await prisma.user.update({ where: { id: uid(request) }, data: { totpSecret: secret, totpEnabled: true } });\n    return { ok: true, enabled: true };";
  const replacement="const recoveryCodes = await enableTotpWithRecoveryCodes(prisma, uid(request), secret);\n    return { ok: true, enabled: true, recoveryCodes };";
  if(text.includes(old))text=text.replace(old,replacement);
  fs.writeFileSync(platform,text);
}
