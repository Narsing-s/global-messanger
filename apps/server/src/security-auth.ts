import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const auth = (app: FastifyInstance) => ({ preHandler: [app.authenticate] });
const uid = (request: any) => String(request.user?.id || '');
const b32 = (s: string) => { const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,v=0,o:number[]=[];for(const c of s.toUpperCase().replace(/=+$/,'')){const n=a.indexOf(c);if(n<0)continue;v=(v<<5)|n;bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8;}}return Buffer.from(o); };
const otp = (secret: string, counter: number) => { const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',b32(secret)).update(b).digest();const off=h[h.length-1]&15;const n=((h[off]&127)<<24)|(h[off+1]<<16)|(h[off+2]<<8)|h[off+3];return String(n%1000000).padStart(6,'0'); };
const validOtp = (secret:string, code:string) => {const c=Math.floor(Date.now()/30000);return [-1,0,1].some(d=>otp(secret,c+d)===code);};

export async function registerSecurityAuth(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/auth/2fa/verify', async (request:any, reply) => {
    const userId=String(request.body?.userId||'');const code=String(request.body?.code||'').replace(/\D/g,'');
    if(!userId||!/^[0-9]{6}$/.test(code))return reply.badRequest('userId and a 6 digit authenticator code are required');
    const user=await prisma.user.findUnique({where:{id:userId},select:{id:true,username:true,displayName:true,avatarUrl:true,totpEnabled:true,totpSecret:true}});
    if(!user||!user.totpEnabled||!user.totpSecret||!validOtp(user.totpSecret,code)) { if(user)await prisma.loginHistory.create({data:{userId:user.id,method:'2fa',success:false,platform:'web',userAgent:String(request.headers['user-agent']||'').slice(0,500),ipAddress:String(request.ip||'').slice(0,64)}}); return reply.unauthorized('Invalid authenticator code'); }
    await prisma.loginHistory.create({data:{userId:user.id,method:'2fa',success:true,platform:'web',userAgent:String(request.headers['user-agent']||'').slice(0,500),ipAddress:String(request.ip||'').slice(0,64)}});
    const token=app.jwt.sign({id:user.id,username:user.username});
    return {token,user:{id:user.id,username:user.username,displayName:user.displayName,avatarUrl:user.avatarUrl}};
  });

  // WebAuthn challenge generation. Verification is intentionally separate so a
  // future authenticator library can validate attestation/assertion signatures.
  app.post('/api/security/passkeys/challenge', auth(app), async (request:any) => ({ challenge:crypto.randomBytes(32).toString('base64url'), rpId:String(request.hostname||'localhost').split(':')[0], userId:uid(request) }));
  app.get('/api/security/passkeys', auth(app), async (request:any) => prisma.passkeyCredential.findMany({where:{userId:uid(request)},select:{id:true,credentialId:true,deviceType:true,transports:true,createdAt:true,lastUsedAt:true},orderBy:{createdAt:'desc'}}));
  app.post('/api/security/passkeys/register', auth(app), async (request:any,reply) => {
    const b=request.body||{};const credentialId=String(b.credentialId||'').trim();const publicKey=String(b.publicKey||'').trim();
    if(!credentialId||!publicKey)return reply.badRequest('credentialId and publicKey are required');
    // The browser/native WebAuthn ceremony must supply an authenticator public key.
    // This endpoint stores it for device management; assertion verification remains
    // gated until a WebAuthn verifier is configured on the deployment.
    const row=await prisma.passkeyCredential.upsert({where:{credentialId},create:{userId:uid(request),credentialId,publicKey,deviceType:String(b.deviceType||'').slice(0,40)||null,transports:Array.isArray(b.transports)?b.transports.join(',').slice(0,200):null},update:{publicKey,deviceType:String(b.deviceType||'').slice(0,40)||null,transports:Array.isArray(b.transports)?b.transports.join(',').slice(0,200):null}});
    return {ok:true,id:row.id,credentialId:row.credentialId,verificationRequired:true};
  });
  app.delete('/api/security/passkeys/:id', auth(app), async (request:any,reply) => {const id=String(request.params.id);const row=await prisma.passkeyCredential.findFirst({where:{id,userId:uid(request)}});if(!row)return reply.notFound('Passkey not found');await prisma.passkeyCredential.delete({where:{id}});return {ok:true};});
}
