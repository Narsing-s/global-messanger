import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
if (source.includes('global-messenger-push-device-v1')) {
  console.log('Push device patch already applied.');
  process.exit(0);
}

const marker = '/* global-messenger-push-device-v1 */';
const routes = `
${marker}
app.post('/api/push/devices', { preHandler: [app.authenticate] }, async (request, reply) => {
  const { id: userId } = authUser(request);
  const parsed = z.object({
    token: z.string().trim().min(20).max(4096),
    platform: z.enum(['android', 'ios', 'web']).default('android')
  }).safeParse(request.body);
  if (!parsed.success) return reply.badRequest('Invalid push device registration');
  const device = await prisma.pushDevice.upsert({
    where: { token: parsed.data.token },
    create: { userId, token: parsed.data.token, platform: parsed.data.platform, enabled: true },
    update: { userId, platform: parsed.data.platform, enabled: true, updatedAt: new Date() }
  });
  return { ok: true, deviceId: device.id };
});

app.get('/api/push/devices', { preHandler: [app.authenticate] }, async request => {
  const { id: userId } = authUser(request);
  return prisma.pushDevice.findMany({
    where: { userId, enabled: true },
    select: { id: true, platform: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }
  });
});

app.delete('/api/push/devices/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
  const { id: userId } = authUser(request);
  const deviceId = String((request.params as any).id);
  const result = await prisma.pushDevice.updateMany({
    where: { id: deviceId, userId },
    data: { enabled: false, updatedAt: new Date() }
  });
  if (!result.count) return reply.notFound('Push device not found');
  return { ok: true };
});
`;

const anchor = '/* -------------------------------------------------------------------------- */\n/* Health';
const index = source.indexOf(anchor);
if (index === -1) {
  console.error('Push device patch: health section not found.');
  process.exit(1);
}
source = source.slice(0, index) + routes + '\n' + source.slice(index);
fs.writeFileSync(file, source);
console.log('Push device routes added successfully.');
