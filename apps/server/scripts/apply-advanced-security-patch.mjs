import fs from 'node:fs';
import path from 'node:path';

const advanced=path.resolve(process.cwd(),'src/advanced.ts');
if(fs.existsSync(advanced)){
  let text=fs.readFileSync(advanced,'utf8');
  const importLine="import { registerSecurityAuth } from './security-auth.js';";
  if(!text.includes(importLine))text=text.replace("import { registerAdvancedPlatform } from './advanced-platform.js';","import { registerAdvancedPlatform } from './advanced-platform.js';\n"+importLine);
  if(!text.includes('await registerSecurityAuth(app, prisma);'))text=text.replace('await registerAdvancedPlatform(app, prisma);','await registerAdvancedPlatform(app, prisma);\n  await registerSecurityAuth(app, prisma);');
  const activityImport="import { registerActivityCenter } from './activity-center.js';";
  if(!text.includes(activityImport))text=text.replace("import { registerSupportRoutes } from './support-routes.js';","import { registerSupportRoutes } from './support-routes.js';\n"+activityImport);
  if(!text.includes('await registerActivityCenter(app, prisma);'))text=text.replace('await registerAdvancedPlatform(app, prisma);','await registerAdvancedPlatform(app, prisma);\n  await registerActivityCenter(app, prisma);');
  fs.writeFileSync(advanced,text);
}

const platform=path.resolve(process.cwd(),'src/advanced-platform.ts');
if(fs.existsSync(platform)){
  let text=fs.readFileSync(platform,'utf8');
  const importLine="import { enableTotpWithRecoveryCodes } from './security-auth.js';";
  if(!text.includes(importLine))text=text.replace("import crypto from 'node:crypto';","import crypto from 'node:crypto';\n"+importLine);
  const pushImport="import { sendPushForMessage } from './push-notifications.js';";
  if(!text.includes(pushImport))text=text.replace(importLine,importLine+'\n'+pushImport);
  const old="await prisma.user.update({ where: { id: uid(request) }, data: { totpSecret: secret, totpEnabled: true } });\n    return { ok: true, enabled: true };";
  const replacement="const recoveryCodes = await enableTotpWithRecoveryCodes(prisma, uid(request), secret);\n    return { ok: true, enabled: true, recoveryCodes };";
  if(text.includes(old))text=text.replace(old,replacement);
  const oldTick="const tick = async () => { try { await prisma.message.updateMany({ where: { type:'scheduled', scheduleStatus:'PENDING', scheduledAt:{ lte:new Date() } }, data:{ type:'text', scheduleStatus:'SENT' } }); } catch (e) { app.log.error(e, 'scheduled message worker failed'); } };";
  const newTick="const tick = async () => { try { const due = await prisma.message.findMany({ where: { type:'scheduled', scheduleStatus:'PENDING', scheduledAt:{ lte:new Date() } }, include: { sender: { select: { displayName:true, username:true } } }, take: 100 }); for (const message of due) { const claimed = await prisma.message.updateMany({ where: { id: message.id, type:'scheduled', scheduleStatus:'PENDING' }, data:{ type:'text', scheduleStatus:'SENT' } }); if (!claimed.count) continue; await sendPushForMessage(prisma, { ...message, type:'text' }, message.sender?.displayName || message.sender?.username || 'New message').catch(error => app.log.error(error, 'scheduled push notification failed')); } } catch (e) { app.log.error(e, 'scheduled message worker failed'); } };";
  if(text.includes(oldTick))text=text.replace(oldTick,newTick);
  fs.writeFileSync(platform,text);
}
