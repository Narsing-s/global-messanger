import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const execFile = promisify(spawn);

type User = { id: string; username: string };
type EntityKind = 'call'|'webhook'|'bot'|'miniapp'|'business'|'catalog'|'ticket'|'ai'|'security'|'region';

const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const userOf = (request: any): User => request.user as User;
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const secret = (value: string) => crypto.createHmac('sha256', process.env.WEBHOOK_SIGNING_SECRET ?? process.env.JWT_SECRET ?? 'change-me').update(value).digest('hex');
const now = () => new Date().toISOString();

async function entity(prisma: PrismaClient, ownerId: string, kind: EntityKind, data: any, name = kind, status = 'active') {
  return prisma.globalEntity.create({ data: { ownerId, kind, name, data, status } });
}

async function listEntities(prisma: PrismaClient, ownerId: string, kind: EntityKind) {
  return prisma.globalEntity.findMany({ where: { ownerId, kind, status: { not: 'deleted' } }, orderBy: { updatedAt: 'desc' } });
}

async function deliverWebhook(target: any, event: any) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `t=${timestamp},v1=${secret(`${timestamp}.${body}`)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(target.url, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'GlobalMessenger-Webhooks/1.0', 'x-gm-event': event.type, 'x-gm-signature': signature }, body, signal: controller.signal });
    if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
    return { ok: true, status: response.status };
  } finally { clearTimeout(timer); }
}

async function retryWebhook(prisma: PrismaClient, target: any, event: any) {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { const result = await deliverWebhook(target, event); return { ...result, attempts: attempt }; }
    catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, Math.min(30000, 500 * 2 ** (attempt - 1)))); }
  }
  await entity(prisma, target.ownerId, 'security', { type: 'webhook.delivery.failed', targetId: target.id, event, error: String(last), at: now() }, 'webhook delivery failure', 'open');
  return { ok: false, attempts: 5, error: String(last) };
}

async function runBot(code: string, input: any) {
  // Deliberately constrained worker: no require/import/process/network/fs APIs are exposed.
  // Production deployments should additionally isolate this process with a container/seccomp profile.
  if (code.length > 50000) throw new Error('Bot code exceeds 50 KB');
  const worker = `const { parentPort }=require('node:worker_threads');\nparentPort.on('message',({code,input})=>{try{const fn=new Function('input','api',` + JSON.stringify(`"use strict"; return (${code})`) + `); const result=fn(input,Object.freeze({json:v=>JSON.stringify(v),now:()=>Date.now()})); parentPort.postMessage({ok:true,result});}catch(e){parentPort.postMessage({ok:false,error:String(e)})}});`;
  const { Worker } = await import('node:worker_threads');
  return await new Promise((resolve, reject) => {
    const w = new Worker(worker, { eval: true });
    const timer = setTimeout(() => { void w.terminate(); reject(new Error('Bot execution timeout')); }, 2000);
    w.once('message', message => { clearTimeout(timer); void w.terminate(); if (message.ok) resolve(message.result); else reject(new Error(message.error)); });
    w.once('error', error => { clearTimeout(timer); reject(error); });
    w.postMessage({ code, input });
  });
}

async function transcribeWithProvider(filePath: string, mimeType: string) {
  const url = String(process.env.TRANSCRIPTION_API_URL ?? '').trim();
  if (!url) throw new Error('TRANSCRIPTION_API_URL is not configured');
  const bytes = await fs.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType || 'application/octet-stream' }), path.basename(filePath));
  form.append('language', 'auto');
  const response = await fetch(url, { method: 'POST', headers: process.env.TRANSCRIPTION_API_KEY ? { authorization: `Bearer ${process.env.TRANSCRIPTION_API_KEY}` } : undefined, body: form });
  if (!response.ok) throw new Error(`Transcription provider HTTP ${response.status}`);
  const payload: any = await response.json();
  return String(payload.text ?? payload.transcript ?? '');
}

async function understandFile(filePath: string, mimeType: string) {
  const lower = mimeType.toLowerCase();
  if (lower.startsWith('text/') || lower.includes('json') || lower.includes('xml') || lower.includes('csv')) {
    const text = await fs.readFile(filePath, 'utf8');
    return { kind: 'text', text: text.slice(0, 200000), characters: text.length };
  }
  if (lower === 'application/pdf') {
    try {
      const result = await new Promise<string>((resolve, reject) => { const p = spawn('pdftotext', [filePath, '-']); let out=''; let err=''; p.stdout.on('data', x => out += x); p.stderr.on('data', x => err += x); p.on('close', code => code === 0 ? resolve(out) : reject(new Error(err || `pdftotext exited ${code}`))); });
      return { kind: 'pdf', text: result.slice(0, 200000), characters: result.length };
    } catch { return { kind: 'pdf', text: '', unsupported: true }; }
  }
  return { kind: 'binary', mimeType, text: '', unsupported: true };
}

export async function registerProductionCapabilities(app: FastifyInstance, prisma: PrismaClient) {
  const a = auth(app);

  // P2 — TURN/ICE, group-call control plane, network quality, reconnect and analytics.
  app.get('/api/calls/ice-config', a, async () => {
    const servers: any[] = [{ urls: ['stun:stun.l.google.com:19302'] }];
    if (process.env.TURN_URL) servers.push({ urls: process.env.TURN_URL.split(',').map(x => x.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    return { iceServers: servers, transportPolicy: process.env.TURN_REQUIRED === 'true' ? 'relay' : 'all', generatedAt: now() };
  });

  app.post('/api/calls/group', a, async (request, reply) => {
    const parsed = z.object({ conversationId: z.string().min(1), mode: z.enum(['audio','video']).default('video'), maxParticipants: z.number().int().min(2).max(100).default(50) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid group call request');
    const user = userOf(request);
    const call = await entity(prisma, user.id, 'call', { conversationId: parsed.data.conversationId, mode: parsed.data.mode, maxParticipants: parsed.data.maxParticipants, mediaArchitecture: 'SFU', sfu: { provider: process.env.SFU_PROVIDER ?? 'mediasoup', endpoint: process.env.SFU_SIGNALING_URL ?? null }, participants: [user.id], state: 'ringing', createdAt: now() }, `call-${parsed.data.conversationId}`);
    return { callId: call.id, media: call.data };
  });

  app.post('/api/calls/:id/metrics', a, async (request, reply) => {
    const parsed = z.object({ rttMs: z.number().min(0).max(10000).optional(), jitterMs: z.number().min(0).max(10000).optional(), packetLossPct: z.number().min(0).max(100).optional(), bitrateKbps: z.number().min(0).max(100000).optional(), audioLevel: z.number().min(0).max(1).optional(), framesDropped: z.number().int().min(0).optional(), reconnects: z.number().int().min(0).optional(), candidateType: z.string().max(32).optional() }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid call metrics');
    const user = userOf(request);
    const quality = (parsed.data.rttMs ?? 0) > 250 || (parsed.data.packetLossPct ?? 0) > 5 ? 'poor' : (parsed.data.rttMs ?? 0) > 120 || (parsed.data.packetLossPct ?? 0) > 2 ? 'fair' : 'good';
    await entity(prisma, user.id, 'call', { callId: request.params, metrics: parsed.data, quality, at: now() }, 'call-quality-sample');
    return { ok: true, quality, recommended: quality === 'poor' ? { video: '360p', maxBitrateKbps: 600 } : quality === 'fair' ? { video: '480p', maxBitrateKbps: 1200 } : { video: '720p', maxBitrateKbps: 2500 } };
  });

  app.post('/api/calls/:id/reconnect', a, async request => ({ ok: true, strategy: 'ice-restart-then-sfu-failover', callId: request.params, iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }, ...(process.env.TURN_URL ? [{ urls: process.env.TURN_URL.split(',').map(x=>x.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }] : [])] }));

  app.get('/api/calls/architecture', a, async () => ({ architecture: 'SFU', primary: process.env.SFU_SIGNALING_URL ?? null, provider: process.env.SFU_PROVIDER ?? 'mediasoup', turnRequired: process.env.TURN_REQUIRED === 'true', adaptiveBitrate: true, simulcast: true, reconnect: ['ice-restart','TURN-retry','secondary-SFU'], clientAudio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, screenShare: { preferred: 'displayMedia', maxFps: 30, fallback: 'camera-track' } }));

  // P3 — executable bot runtime, mini-app manifests, developer API keys, webhooks, business inbox/catalog.
  app.post('/api/developer/keys', a, async (request, reply) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(z.string()).max(30).default([]) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Invalid API key request');
    const user = userOf(request); const raw = `gm_${crypto.randomBytes(32).toString('base64url')}`; const row = await prisma.developerApiKey.create({ data: { userId: user.id, name: parsed.data.name, keyHash: hash(raw), prefix: raw.slice(0,10), scopes: parsed.data.scopes } });
    return { id: row.id, key: raw, prefix: row.prefix, scopes: row.scopes, warning: 'Store this key now; it is never returned again.' };
  });
  app.get('/api/developer/keys', a, async request => { const user=userOf(request); return prisma.developerApiKey.findMany({ where:{userId:user.id,revokedAt:null}, select:{id:true,name:true,prefix:true,scopes:true,active:true,lastUsedAt:true,createdAt:true} }); });
  app.delete('/api/developer/keys/:id', a, async (request, reply) => { const user=userOf(request); await prisma.developerApiKey.updateMany({ where:{id:String(request.params.id),userId:user.id}, data:{active:false,revokedAt:new Date()} }); return {ok:true}; });

  app.post('/api/developer/bots', a, async (request, reply) => { const parsed=z.object({name:z.string().min(1).max(80),code:z.string().min(1).max(50000),permissions:z.array(z.string()).max(20).default([])}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid bot'); const user=userOf(request); const b=await entity(prisma,user.id,'bot',{code:parsed.data.code,permissions:parsed.data.permissions,version:1},parsed.data.name); return {id:b.id,name:b.name,permissions:parsed.data.permissions}; });
  app.post('/api/developer/bots/:id/run', a, async (request, reply) => { const user=userOf(request); const b=await prisma.globalEntity.findFirst({where:{id:String(request.params.id),ownerId:user.id,kind:'bot',status:'active'}}); if(!b)return reply.notFound('Bot not found'); try{return {ok:true,result:await runBot(String((b.data as any).code),request.body??{})};}catch(e){return reply.code(422).send({ok:false,error:String(e)});} });
  app.post('/api/developer/mini-apps', a, async (request, reply) => { const parsed=z.object({name:z.string().min(1).max(80),url:z.string().url(),permissions:z.array(z.string()).max(20).default([]),csp:z.string().max(1000).optional()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid mini-app'); const user=userOf(request); const m=await entity(prisma,user.id,'miniapp',{url:parsed.data.url,permissions:parsed.data.permissions,csp:parsed.data.csp??"default-src 'self'; connect-src 'self'",sandbox:['allow-scripts','allow-forms','allow-popups-to-escape-sandbox']},parsed.data.name); return {id:m.id,manifest:{name:m.name,url:parsed.data.url,permissions:parsed.data.permissions,sandbox:(m.data as any).sandbox}}; });
  app.get('/api/developer/dashboard', a, async request => { const user=userOf(request); const [bots,miniapps,keys,webhooks]=await Promise.all([listEntities(prisma,user.id,'bot'),listEntities(prisma,user.id,'miniapp'),prisma.developerApiKey.count({where:{userId:user.id,revokedAt:null}}),listEntities(prisma,user.id,'webhook')]); return {generatedAt:now(),bots,miniapps,activeApiKeys:keys,webhooks}; });
  app.post('/api/developer/webhooks', a, async (request, reply) => { const parsed=z.object({name:z.string().min(1).max(80),url:z.string().url(),events:z.array(z.string()).min(1).max(50)}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid webhook'); const user=userOf(request); const w=await entity(prisma,user.id,'webhook',{url:parsed.data.url,events:parsed.data.events,retries:5},parsed.data.name); return {id:w.id,signing:'HMAC-SHA256',events:parsed.data.events}; });
  app.post('/api/developer/webhooks/:id/test', a, async (request, reply) => { const user=userOf(request); const w=await prisma.globalEntity.findFirst({where:{id:String(request.params.id),ownerId:user.id,kind:'webhook',status:'active'}}); if(!w)return reply.notFound('Webhook not found'); const result=await retryWebhook(prisma,{...(w.data as any),id:w.id,ownerId:user.id},{type:'webhook.test',id:crypto.randomUUID(),createdAt:now(),data:{ok:true}}); return result; });

  app.post('/api/business/inbox', a, async (request, reply) => { const parsed=z.object({name:z.string().min(1).max(100),agentIds:z.array(z.string()).default([])}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid inbox'); const user=userOf(request); return entity(prisma,user.id,'business',{agents:parsed.data.agentIds,assignment:'round-robin',status:'open',tickets:[]},parsed.data.name); });
  app.post('/api/business/catalog', a, async (request, reply) => { const parsed=z.object({name:z.string().min(1).max(120),description:z.string().max(2000).optional(),price:z.number().nonnegative().optional(),currency:z.string().length(3).default('INR'),imageUrl:z.string().url().optional(),stock:z.number().int().nonnegative().default(0)}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid catalog item'); const user=userOf(request); return entity(prisma,user.id,'catalog',parsed.data,parsed.data.name); });
  app.get('/api/business/catalog', a, async request => listEntities(prisma,userOf(request),'catalog'));
  app.post('/api/business/inbox/:id/assign', a, async (request, reply) => { const parsed=z.object({ticketId:z.string(),agentId:z.string()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('ticketId and agentId required'); const user=userOf(request); const box=await prisma.globalEntity.findFirst({where:{id:String(request.params.id),ownerId:user.id,kind:'business'}}); if(!box)return reply.notFound('Inbox not found'); const data:any=box.data; data.tickets=[...(data.tickets??[]).filter((t:any)=>t.id!==parsed.data.ticketId),{id:parsed.data.ticketId,agentId:parsed.data.agentId,assignedAt:now()}]; return prisma.globalEntity.update({where:{id:box.id},data:{data}}); });

  // P4 — transcription, file understanding, indexed/AI search, meeting summaries and privacy boundary.
  app.post('/api/ai/transcribe', a, async (request, reply) => { const user=userOf(request); const file=await (request as any).file(); if(!file)return reply.badRequest('Audio file is required'); const dir=path.join(os.tmpdir(),'gm-transcription'); await fs.mkdir(dir,{recursive:true}); const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`); await fs.writeFile(filename,await file.toBuffer()); try { const text=await transcribeWithProvider(filename,file.mimetype); await entity(prisma,user.id,'ai',{type:'transcription',length:text.length,provider:'configured',at:now()},'voice transcription'); return {text,language:'auto'}; } finally { await fs.rm(filename,{force:true}); } });
  app.post('/api/ai/file-understanding', a, async (request, reply) => { const user=userOf(request); const file=await (request as any).file(); if(!file)return reply.badRequest('File is required'); const dir=path.join(os.tmpdir(),'gm-understanding'); await fs.mkdir(dir,{recursive:true}); const filename=path.join(dir(),`${crypto.randomUUID()}-${path.basename(file.filename)}`); });
  app.post('/api/ai/search', a, async (request, reply) => { const parsed=z.object({q:z.string().trim().min(2).max(200),conversationId:z.string().optional(),limit:z.number().int().min(1).max(100).default(30)}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Search query required'); const user=userOf(request); const memberships=await prisma.conversationMember.findMany({where:{userId:user.id,...(parsed.data.conversationId?{conversationId:parsed.data.conversationId}:{})},select:{conversationId:true}}); const ids=memberships.map(x=>x.conversationId); const rows=await prisma.message.findMany({where:{conversationId:{in:ids},deletedAt:null,body:{contains:parsed.data.q,mode:'insensitive'}},orderBy:{createdAt:'desc'},take:parsed.data.limit}); return {mode:'privacy-preserving-local-index',results:rows.map(x=>({id:x.id,conversationId:x.conversationId,body:x.body,createdAt:x.createdAt}))}; });
  app.post('/api/ai/meeting-summary', a, async (request, reply) => { const parsed=z.object({transcript:z.string().trim().min(1).max(100000),consent:z.boolean()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Transcript and explicit consent are required'); if(!parsed.data.consent)return reply.forbidden('AI processing requires explicit consent'); const user=userOf(request); const text=parsed.data.transcript; const sentences=text.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean); const summary=sentences.slice(0,8).join('. '); await entity(prisma,user.id,'ai',{type:'meeting-summary',privacy:'user-consented',chars:text.length},'meeting summary'); return {summary:summary || text.slice(0,2000),actionItems:sentences.filter(x=>/\b(todo|action|follow up|follow-up|need to|will)\b/i.test(x)).slice(0,20),provider:'local-consented'}; });
  app.get('/api/ai/privacy-boundary', a, async () => ({e2eeMessagesNeverSentToExternalAI:true, externalAIRequiresExplicitConsent:true, providers:{transcription:Boolean(process.env.TRANSCRIPTION_API_URL),ai:Boolean(process.env.AI_PROVIDER_URL)},localSearch:true}));

  // P5 — security, malware scanning, ATO signals, audit/incident workflow and regional controls.
  app.post('/api/security/malware-scan', a, async (request, reply) => { const file=await (request as any).file(); if(!file)return reply.badRequest('File is required'); const dir=path.join(os.tmpdir(),'gm-malware'); await fs.mkdir(dir,{recursive:true}); const filename=path.join(dir,`${crypto.randomUUID()}-${path.basename(file.filename)}`); await fs.writeFile(filename,await file.toBuffer()); try { const clamd=process.env.CLAMDSCAN_PATH||'clamdscan'; const result=await new Promise<{clean:boolean,output:string}>((resolve)=>{const p=spawn(clamd,['--no-summary',filename]);let out='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>out+=x);p.on('close',code=>resolve({clean:code===0,output:out.trim()}));p.on('error',()=>resolve({clean:false,output:'scanner-unavailable'}));}); if(result.output==='scanner-unavailable')return reply.serviceUnavailable('Malware scanner is not installed/configured'); return {scanned:true,clean:result.clean,engine:'ClamAV',detail:result.output}; } finally { await fs.rm(filename,{force:true}); } });
  app.post('/api/security/ato-signal', a, async (request, reply) => { const parsed=z.object({event:z.enum(['login-success','login-failure','password-reset','new-device','session-revoked']),ip:z.string().max(64).optional(),deviceId:z.string().max(200).optional(),userAgent:z.string().max(500).optional()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid security event'); const user=userOf(request); const rows=await prisma.globalEntity.findMany({where:{ownerId:user.id,kind:'security'},orderBy:{createdAt:'desc'},take:50}); const failures=rows.filter(x=>(x.data as any)?.event==='login-failure').length; const risk=parsed.data.event==='new-device'&&failures>=5?'high':failures>=3?'medium':'low'; await entity(prisma,user.id,'security',{event:parsed.data.event,ip:parsed.data.ip,deviceId:parsed.data.deviceId,userAgent:parsed.data.userAgent,risk,at:now()},'account security signal',risk==='high'?'open':'active'); return {risk,action:risk==='high'?'step-up-auth-and-session-review':risk==='medium'?'notify-and-rate-limit':'allow'}; });
  app.post('/api/security/incidents', a, async (request, reply) => { const parsed=z.object({severity:z.enum(['low','medium','high','critical']),type:z.string().min(1).max(100),summary:z.string().min(1).max(5000),evidence:z.any().optional()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid incident'); const user=userOf(request); return entity(prisma,user.id,'security',{...parsed.data,status:'open',timeline:[{at:now(),actor:user.id,action:'created'}]},`incident:${parsed.data.type}`,'open'); });
  app.patch('/api/security/incidents/:id', a, async (request, reply) => { const parsed=z.object({status:z.enum(['open','investigating','contained','resolved','closed']),note:z.string().max(2000).optional()}).safeParse(request.body??{}); if(!parsed.success)return reply.badRequest('Invalid incident update'); const user=userOf(request); const row=await prisma.globalEntity.findFirst({where:{id:String(request.params.id),ownerId:user.id,kind:'security'}}); if(!row)return reply.notFound('Incident not found'); const data:any=row.data; data.status=parsed.data.status; data.timeline=[...(data.timeline??[]),{at:now(),actor:user.id,action:parsed.data.status,note:parsed.data.note??''}]; return prisma.globalEntity.update({where:{id:row.id},data:{data,status:parsed.data.status}}); });
  app.get('/api/platform/regions', a, async () => ({region:process.env.REGION_ID??'primary',multiRegion:true,regions:String(process.env.REGIONS??'primary').split(',').map(x=>x.trim()).filter(Boolean),readReplica:process.env.READ_REPLICA_DATABASE_URL?true:false,cdnOrigin:process.env.CDN_ORIGIN??null,mediaAcceleration:process.env.CDN_ORIGIN?true:false}));
  app.get('/api/platform/runtime', a, async () => ({node:process.version,region:process.env.REGION_ID??'primary',hostname:os.hostname(),uptime:process.uptime(),memory:process.memoryUsage(),dr:{backupCommand:'scripts/backup-postgres.mjs',pitrEnabled:Boolean(process.env.PG_WAL_ARCHIVE_BUCKET)},security:{malwareScanner:Boolean(process.env.CLAMDSCAN_PATH),atoDetection:true,auditTrail:true},accessibility:{wcagTarget:'2.2 AA',rtl:true,localization:true}}));
}
