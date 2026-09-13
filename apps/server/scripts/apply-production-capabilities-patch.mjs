import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const advanced = path.resolve(root, 'src/advanced.ts');
const capability = path.resolve(root, 'src/production-capabilities.ts');

if (fs.existsSync(capability)) {
  let s = fs.readFileSync(capability, 'utf8');
  s = s.replace("import { promisify } from 'node:util';\n", '');
  s = s.replace("\nconst execFile = promisify(spawn);\n", '\n');
  if (!s.includes("import net from 'node:net';")) s = s.replace("import { spawn } from 'node:child_process';", "import { spawn } from 'node:child_process';\nimport net from 'node:net';");
  s = s.replace(/const filename=path\.join\(dir\(\),/g, 'const filename=path.join(dir,');
  if (!s.includes('async function transcribeWithProviderOrLocal')) {
    const helper = `async function transcribeWithProviderOrLocal(filePath: string, mimeType: string) {\n  if (process.env.TRANSCRIPTION_API_URL) return transcribeWithProvider(filePath, mimeType);\n  const whisper = process.env.WHISPER_CPP_PATH;\n  if (!whisper) throw new Error('Configure TRANSCRIPTION_API_URL or WHISPER_CPP_PATH');\n  const model = process.env.WHISPER_MODEL_PATH;\n  if (!model) throw new Error('WHISPER_MODEL_PATH is required for local transcription');\n  const output = filePath + '.txt';\n  await new Promise<void>((resolve, reject) => { const p=spawn(whisper,['-m',model,'-f',filePath,'-otxt','-of',output.replace(/\\.txt$/,''),'-nt']); let err=''; p.stderr.on('data',x=>err+=x); p.on('error',reject); p.on('close',code=>code===0?resolve():reject(new Error(err||'whisper.cpp failed'))); });\n  const text=await fs.readFile(output,'utf8'); await fs.rm(output,{force:true}); return text.trim();\n}\n\n`;
    s = s.replace('async function understandFile', helper + 'async function understandFile');
  }
  if (!s.includes('async function scanWithClamd')) {
    const scanner = `async function scanWithClamd(filePath: string) {\n  const host=process.env.CLAMAV_HOST||'clamav'; const port=Number(process.env.CLAMAV_PORT||3310); const bytes=await fs.readFile(filePath);\n  return await new Promise<{clean:boolean,detail:string}>((resolve,reject)=>{const socket=net.createConnection({host,port});let output='';socket.setTimeout(15000);socket.on('data',chunk=>output+=chunk.toString());socket.on('timeout',()=>{socket.destroy();reject(new Error('ClamAV timeout'))});socket.on('error',reject);socket.on('connect',()=>{socket.write(Buffer.from('zINSTREAM\\0'));for(let i=0;i<bytes.length;i+=131072){const chunk=bytes.subarray(i,i+131072);const size=Buffer.alloc(4);size.writeUInt32BE(chunk.length);socket.write(size);socket.write(chunk);}socket.write(Buffer.alloc(4));});socket.on('close',()=>resolve({clean:/OK$/.test(output.trim()),detail:output.trim()}));});\n}\n\n`;
    s = s.replace('async function understandFile', scanner + 'async function understandFile');
  }
  s = s.replace(/transcribeWithProvider\(filename,file\.mimetype\)/g, 'transcribeWithProviderOrLocal(filename,file.mimetype)');
  const fileRoute = "  app.post('/api/ai/file-understanding', a, async (request, reply) => { const user=userOf(request); const file=await (request as any).file(); if(!file)return reply.badRequest('File is required'); const dir=path.join(os.tmpdir(),'gm-understanding'); await fs.mkdir(dir,{recursive:true}); const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`); await fs.writeFile(filename,await file.toBuffer()); try { const result=await understandFile(filename,file.mimetype); await entity(prisma,user.id,'ai',{type:'file-understanding',mimeType:file.mimetype,filename:path.basename(file.filename),supported:!result.unsupported},'file understanding'); return result; } finally { await fs.rm(filename,{force:true}); } });";
  s = s.replace(/  app\.post\('\/api\/ai\/file-understanding'[\s\S]*?\n  app\.post\('\/api\/ai\/search'/, fileRoute + "\n  app.post('/api/ai/search'");
  s = s.replace(/const clamd=process\.env\.CLAMDSCAN_PATH\|\|'clamdscan'; const result=await new Promise<\{clean:boolean,output:string\}>\(\(resolve\)=>\{[\s\S]*?\}\); if\(result\.output==='scanner-unavailable'\)return reply\.serviceUnavailable\('Malware scanner is not installed\/configured'\); return \{scanned:true,clean:result\.clean,engine:'ClamAV',detail:result\.output\};/, "const result=await scanWithClamd(filename); return {scanned:true,clean:result.clean,engine:'ClamAV',detail:result.detail};");
  if (!s.includes('/api/ai/semantic-search')) {
    const searchRoute = `  app.post('/api/ai/semantic-search', a, async (request, reply) => { const parsed=z.object({q:z.string().trim().min(2).max(200),conversationId:z.string().optional(),limit:z.number().int().min(1).max(100).default(30)}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Search query required'); const user=userOf(request); const memberships=await prisma.conversationMember.findMany({where:{userId:user.id,...(parsed.data.conversationId?{conversationId:parsed.data.conversationId}:{})},select:{conversationId:true}}); const ids=memberships.map(x=>x.conversationId); if(!ids.length)return {mode:'postgres-fts',results:[]}; const q=parsed.data.q.replace(/[&|!():*]/g,' ').trim(); const results=await prisma.$queryRawUnsafe<any[]>(\`SELECT id,"conversationId",body,"createdAt",ts_rank(to_tsvector('simple',coalesce(body,'')),plainto_tsquery('simple',$1)) AS rank FROM "Message" WHERE "conversationId"=ANY($2) AND "deletedAt" IS NULL AND to_tsvector('simple',coalesce(body,'')) @@ plainto_tsquery('simple',$1) ORDER BY rank DESC,"createdAt" DESC LIMIT $3\`,q,ids,parsed.data.limit); return {mode:'postgres-fts-ranked',results}; });\n`;
    s = s.replace("  app.get('/api/ai/privacy-boundary'", searchRoute + "  app.get('/api/ai/privacy-boundary'");
  }
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
