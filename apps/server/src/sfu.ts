import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import * as mediasoup from 'mediasoup';

let worker: mediasoup.types.Worker | null = null;
const routers = new Map<string, mediasoup.types.Router>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();
const producers = new Map<string, mediasoup.types.Producer>();
const consumers = new Map<string, mediasoup.types.Consumer>();

const codecs: mediasoup.types.RtpCodecCapability[] = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
  { kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters: { 'packetization-mode': 1, 'profile-level-id': '42e01f', 'level-asymmetry-allowed': 1 } }
];

async function getWorker() {
  if (worker && !worker.closed) return worker;
  worker = await mediasoup.createWorker({ logLevel: (process.env.MEDIASOUP_LOG_LEVEL as any) || 'warn', rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT ?? 40000), rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT ?? 49999) });
  worker.on('died', () => { worker = null; });
  return worker;
}

async function getRouter(roomId: string) {
  const existing = routers.get(roomId);
  if (existing && !existing.closed) return existing;
  const router = await (await getWorker()).createRouter({ mediaCodecs: codecs });
  routers.set(roomId, router);
  return router;
}

export async function registerSfu(app: FastifyInstance, _prisma: PrismaClient) {
  app.get('/api/sfu/:roomId/capabilities', { preHandler: [app.authenticate] }, async request => ({ routerRtpCapabilities: (await getRouter(String((request.params as any).roomId))).rtpCapabilities }));

  app.post('/api/sfu/:roomId/transport', { preHandler: [app.authenticate] }, async request => {
    const router = await getRouter(String((request.params as any).roomId));
    const announcedAddress = process.env.MEDIASOUP_ANNOUNCED_IP || undefined;
    const listenIp = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0';
    const transport = await router.createWebRtcTransport({ listenInfos: [{ protocol: 'udp', ip: listenIp, ...(announcedAddress ? { announcedAddress } : {}) }, { protocol: 'tcp', ip: listenIp, ...(announcedAddress ? { announcedAddress } : {}) }], enableUdp: true, enableTcp: true, preferUdp: true, initialAvailableOutgoingBitrate: 1500000, enableSctp: true, maxSctpMessageSize: 262144 });
    transports.set(transport.id, transport);
    transport.on('routerclose', () => transports.delete(transport.id));
    return { id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters, sctpParameters: transport.sctpParameters };
  });

  app.post('/api/sfu/transport/:id/connect', { preHandler: [app.authenticate] }, async request => {
    const transport = transports.get(String((request.params as any).id)); if (!transport) throw app.httpErrors.notFound('SFU transport not found');
    await transport.connect({ dtlsParameters: (request.body as any)?.dtlsParameters }); return { ok: true };
  });

  app.post('/api/sfu/transport/:id/produce', { preHandler: [app.authenticate] }, async request => {
    const transport = transports.get(String((request.params as any).id)); if (!transport) throw app.httpErrors.notFound('SFU transport not found');
    const body: any = request.body ?? {};
    const producer = await transport.produce({ kind: body.kind, rtpParameters: body.rtpParameters, appData: body.appData });
    producers.set(producer.id, producer); producer.on('transportclose', () => producers.delete(producer.id));
    return { id: producer.id };
  });

  app.get('/api/sfu/:roomId/producers', { preHandler: [app.authenticate] }, async request => ({ roomId: String((request.params as any).roomId), producerIds: [...producers.keys()] }));

  app.post('/api/sfu/transport/:id/consume', { preHandler: [app.authenticate] }, async request => {
    const transport = transports.get(String((request.params as any).id)); if (!transport) throw app.httpErrors.notFound('SFU transport not found');
    const body: any = request.body ?? {};
    const router = [...routers.values()].find(r => !r.closed && r.canConsume({ producerId: body.producerId, rtpCapabilities: body.rtpCapabilities }));
    if (!router) throw app.httpErrors.badRequest('Producer cannot be consumed by this client');
    const consumer = await transport.consume({ producerId: body.producerId, rtpCapabilities: body.rtpCapabilities, paused: true });
    consumers.set(consumer.id, consumer); consumer.on('transportclose', () => consumers.delete(consumer.id));
    return { id: consumer.id, producerId: body.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters, type: consumer.type, producerPaused: consumer.producerPaused };
  });

  app.post('/api/sfu/consumer/:id/resume', { preHandler: [app.authenticate] }, async request => { const c = consumers.get(String((request.params as any).id)); if (!c) throw app.httpErrors.notFound('Consumer not found'); await c.resume(); return { ok: true }; });
  app.get('/api/sfu/health', async () => ({ ok: Boolean(worker && !worker.closed), workers: worker && !worker.closed ? 1 : 0, rooms: [...routers.keys()], transports: transports.size, producers: producers.size, consumers: consumers.size, rtcPortRange: `${process.env.MEDIASOUP_RTC_MIN_PORT ?? 40000}-${process.env.MEDIASOUP_RTC_MAX_PORT ?? 49999}` }));
}
