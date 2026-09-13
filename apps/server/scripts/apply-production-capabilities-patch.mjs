import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const advanced = path.resolve(root, 'src/advanced.ts');
const capability = path.resolve(root, 'src/production-capabilities.ts');

if (fs.existsSync(capability)) {
  let s = fs.readFileSync(capability, 'utf8');
  s = s.replace("import { promisify } from 'node:util';\n", '');
  s = s.replace("\nconst execFile = promisify(spawn);\n", '\n');
  s = s.replace(/const filename=path\.join\(dir\(\),/g, 'const filename=path.join(dir,');
  const fileRoute = "  app.post('/api/ai/file-understanding', a, async (request, reply) => { const user=userOf(request); const file=await (request as any).file(); if(!file)return reply.badRequest('File is required'); const dir=path.join(os.tmpdir(),'gm-understanding'); await fs.mkdir(dir,{recursive:true}); const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`); await fs.writeFile(filename,await file.toBuffer()); try { const result=await understandFile(filename,file.mimetype); await entity(prisma,user.id,'ai',{type:'file-understanding',mimeType:file.mimetype,filename:path.basename(file.filename),supported:!result.unsupported},'file understanding'); return result; } finally { await fs.rm(filename,{force:true}); } });";
  s = s.replace(/  app\.post\('\/api\/ai\/file-understanding'[\s\S]*?\n  app\.post\('\/api\/ai\/search'/, fileRoute + "\n  app.post('/api/ai/search'");
  fs.writeFileSync(capability, s);
}

if (fs.existsSync(advanced)) {
  let s = fs.readFileSync(advanced, 'utf8');
  const productionImport = "import { registerProductionCapabilities } from './production-capabilities.js';";
  const sfuImport = "import { registerSfu } from './sfu.js';";
  if (!s.includes(productionImport)) s = s.replace("import { registerGlobalMarketPlatform } from './global-market-platform.js';", "import { registerGlobalMarketPlatform } from './global-market-platform.js';\n" + productionImport);
  if (!s.includes(sfuImport)) s = s.replace(productionImport, productionImport + '\n' + sfuImport);
  if (!s.includes('await registerProductionCapabilities(app, prisma);')) s = s.replace('await registerGlobalMarketPlatform(app, prisma);', 'await registerGlobalMarketPlatform(app, prisma);\n  await registerProductionCapabilities(app, prisma);');
  if (!s.includes('await registerSfu(app, prisma);')) s = s.replace('await registerProductionCapabilities(app, prisma);', 'await registerProductionCapabilities(app, prisma);\n  await registerSfu(app, prisma);');
  fs.writeFileSync(advanced, s);
}
