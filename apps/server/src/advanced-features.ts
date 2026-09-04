import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

type Req = any;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const userIdOf = (request: Req) => String(request.user?.id || '');

export async function registerAdvancedFeatures(app: FastifyInstance, prisma: PrismaClient) {
  const auth = { preHandler: [app.authenticate] };
  app.get('/api/profile/me', auth, async (request) => prisma.user.findUnique({where:{id:userIdOf(request)},select:{id:true,username:true,email:true,displayName:true,avatarUrl:true,lastSeenAt:true,privacyLastSeen:true,privacyProfilePhoto:true}}));
  app.patch('/api/profile/me', auth, async (request, reply) => { const b:any=request.body||{}; const displayName=typeof b.displayName==='string'?b.displayName.trim().slice(0,80):undefined; const avatarUrl=typeof b.avatarUrl==='string'?b.avatarUrl.trim().slice(0,1000):b.avatarUrl===null?null:undefined; if(displayName!==undefined&&!displayName)return reply.badRequest('Display name cannot be empty'); return prisma.user.update({where:{id:userIdOf(request)},data:{...(displayName!==undefined?{displayName}:{}),...(avatarUrl!==undefined?{avatarUrl}: {})},select:{id:true,username:true,email:true,displayName:true,avatarUrl:true,lastSeenAt:true,privacyLastSeen:true,privacyProfilePhoto:true}}); });
  app.get('/api/privacy', auth, async (request) => prisma.user.findUnique({where:{id:userIdOf(request)},select:{privacyLastSeen:true,privacyProfilePhoto:true}}));
  app.patch('/api/privacy', auth, async (request, reply) => { const b:any=request.body||{}; const allowed=['everyone','contacts','nobody']; if((b.privacyLastSeen&&!allowed.includes(b.privacyLastSeen))||(b.privacyProfilePhoto&&!allowed.includes(b.privacyProfilePhoto)))return reply.badRequest('Privacy value must be everyone, contacts, or nobody'); return prisma.user.update({where:{id:userIdOf(request)},data:{...(b.privacyLastSeen?{privacyLastSeen:b.privacyLastSeen}:{}),...(b.privacyProfilePhoto?{privacyProfilePhoto:b.privacyProfilePhoto}:{})},select:{privacyLastSeen:true,privacyProfilePhoto:true}}); });
  app.get('/api/sessions', auth, async (request) => prisma.userSession.findMany({where:{userId:userIdOf(request),revokedAt:null},orderBy:{lastSeenAt:'desc'},select:{id:true,deviceName:true,platform:true,userAgent:true,ipAddress:true,createdAt:true,lastSeenAt:true,expiresAt:true}}));
  app.post('/api/sessions/current', auth, async (request) => { const token=String(request.headers.authorization||'').replace(/^Bearer\s+/i,''); if(!token)return {ok:false}; const tokenHash=hashToken(token); const existing=await prisma.userSession.findUnique({where:{tokenHash}}); if(existing)return existing; const b:any=request.body||{}; return prisma.userSession.create({data:{userId:userIdOf(request),tokenHash,deviceName:String(b.deviceName||'Unknown device').slice(0,80),platform:String(b.platform||'web').slice(0,30),userAgent:String(request.headers['user-agent']||'').slice(0,500),ipAddress:String(request.ip||'').slice(0,64)},select:{id:true,deviceName:true,platform:true,userAgent:true,ipAddress:true,createdAt:true,lastSeenAt:true}}); });
  app.delete('/api/sessions/:id', auth, async (request, reply) => { const id=String((request.params as any).id); const s=await prisma.userSession.findFirst({where:{id,userId:userIdOf(request)}}); if(!s)return reply.notFound('Session not found'); await prisma.userSession.update({where:{id},data:{revokedAt:new Date()}}); return {ok:true}; });
  app.delete('/api/sessions', auth, async (request) => { const current=hashToken(String(request.headers.authorization||'').replace(/^Bearer\s+/i,'')); await prisma.userSession.updateMany({where:{userId:userIdOf(request),tokenHash:{not:current},revokedAt:null},data:{revokedAt:new Date()}}); return {ok:true}; });

  // Disappearing messages are an explicit per-chat option. Off means normal messages never expire.
  app.get('/api/conversations/:id/disappearing', auth, async (request, reply) => { const conversationId=String((request.params as any).id); const m=await prisma.conversationMember.findUnique({where:{conversationId_userId:{conversationId,userId:userIdOf(request)}},select:{disappearingSeconds:true}}); if(!m)return reply.notFound('Chat not found'); return {seconds:m.disappearingSeconds||0}; });
  app.put('/api/conversations/:id/disappearing', auth, async (request, reply) => { const conversationId=String((request.params as any).id); const userId=userIdOf(request); const m=await prisma.conversationMember.findUnique({where:{conversationId_userId:{conversationId,userId}}}); if(!m)return reply.notFound('Chat not found'); const seconds=Number((request.body as any)?.seconds||0); const allowed=[0,86400,604800,2592000]; if(!allowed.includes(seconds))return reply.badRequest('Seconds must be 0, 86400, 604800, or 2592000'); await prisma.conversationMember.update({where:{conversationId_userId:{conversationId,userId}},data:{disappearingSeconds:seconds||null}}); return {ok:true,seconds}; });

  // This endpoint only targets messages that have an explicit expiresAt set by the
  // disappearing-message feature. Normal messages have expiresAt=null and are never touched.
  app.post('/api/messages/cleanup-expired', async (request, reply) => { const secret=process.env.CRON_SECRET; if(secret&&String(request.headers['x-cron-secret']||'')!==secret)return reply.code(401).send({message:'Unauthorized'}); const result=await prisma.message.deleteMany({where:{expiresAt:{lte:new Date()}}}); return {ok:true,deleted:result.count}; });
}

// Runs two independent retention policies:
// 1) disappearing-message records are removed only when they explicitly expired;
// 2) conversations inactive for 60+ days are archived from the active list, never deleted.
export function startExpiredMessageCleanup(prisma: PrismaClient) {
  const interval = 24 * 60 * 60 * 1000;
  const maintainRetention = async () => {
    try {
      await prisma.message.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    } catch (error) {
      console.error('[Global Messenger] disappearing-message cleanup failed', error);
    }
    try {
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const stale = await prisma.conversation.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true }
      });
      if (!stale.length) return;
      await prisma.conversationMember.updateMany({
        where: { conversationId: { in: stale.map(c => c.id) }, archivedAt: null },
        data: { archivedAt: new Date() }
      });
    } catch (error) {
      console.error('[Global Messenger] 60-day inactive-chat archive failed', error);
    }
  };
  void maintainRetention();
  setInterval(() => void maintainRetention(), interval).unref();
}
