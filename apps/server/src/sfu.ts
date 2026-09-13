import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import * as mediasoup from 'mediasoup';

let worker: mediasoup.types.Worker | null = null;
const routers = new Map<string, mediasoup.types.Router>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();
const transportRooms = new Map<string, string>();
const producers = new Map<string, mediasoup.types.Producer>();
const producerRooms = new Map<string, string>();
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
  router.on('workerclose', () => routers.delete(roomId));
  return router;
}

export async function registerSfu(app: FastifyInstance, _prisma: PrismaClient) {
  app.get('/api/sfu/:roomId/capabilities', { preHandler: [app.authenticate] }, async request => ({ routerRtpCapabilities: (await getRouter(String((request.params as any).roomId))).rtpCapabilities }));

  app.post('/api/sfu/:roomId/transport', { preHandler: [app.authenticate] }, async request => {
    const roomId = String((request.params as any).roomId);
    const router = await getRouter(roomId);
    const announcedAddress = process.env.MEDIASOUP_ANNOUNCED_IP || undefined;
    const listenIp = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0';
    const transport = await router.createWebRtcTransport({ listenInfos: [{ protocol: 'udp', ip: listenIp, ...(announcedAddress ? { announcedAddress } : {}) }, { protocol: 'tcp', ip: listenIp, ...(announcedAddress ? { announcedAddress } : {}) }], enableUdp: true, enableTcp: true, preferUdp: true, initialAvailableOutgoingBitrate: 1500000, enableSctp: true, maxSctpMessageSize: 262144 });
    transports.set(transport.id, transport); transportRooms.set(transport.id, roomId);
    const cleanup = () => { transports.delete(transport.id); transportRooms.delete(transport.id); };
    transport.on('routerclose', cleanup); transport.on('close', cleanup);
    return { id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters, sctpParameters: transport.sctpParameters };
  });

  app.post('/api/sfu/transport/:id/connect', { preHandler: [app.authenticate] }, async request => {
    const transport = transports.get(String((request.params as any).id)); if (!transport) throw app.httpErrors.notFound('SFU transport not found');
    await transport.connect({ dtlsParameters: (request.body as any)?.dtlsParameters }); return { ok: true };
  });

  app.post('/api/sfu/transport/:id/produce', { preHandler: [app.authenticate] }, async request => {
    const transportId = String((request.params as any).id);
    const transport = transports.get(transportId); const roomId = transportRooms.get(transportId);
    if (!transport || !roomId) throw app.httpErrors.notFound('SFU transport not found');
    const body: any = request.body ?? {};
    if (body.kind !== 'audio' && body.kind !== 'video') throw app.httpErrors.badRequest('Invalid media kind');
    const producer = await transport.produce({ kind: body.kind, rtpParameters: body.rtpParameters, appData: body.appData });
    producers.set(producer.id, producer); producerRooms.set(producer.id, roomId);
    const cleanup = () => { producers.delete(producer.id); producerRooms.delete(producer.id); };
    producer.on('transportclose', cleanup); producer.on('close', cleanup);
    return { id: producer.id };
  });

  app.get('/api/sfu/:roomId/producers', { preHandler: [app.authenticate] }, async request => {
    const roomId = String((request.params as any).roomId);
    return { roomId, producerIds: [...producers.keys()].filter(id => producerRooms.get(id) === roomId) };
  });

  app.post('/api/sfu/transport/:id/consume', { preHandler: [app.authenticate] }, async request => {
    const transportId = String((request.params as any).id);
    const transport = transports.get(transportId); const roomId = transportRooms.get(transportId);
    if (!transport || !roomId) throw app.httpErrors.notFound('SFU transport not found');
    const body: any = request.body ?? {}; const producerId = String(body.producerId);
    if (producerRooms.get(producerId) !== roomId) throw app.httpErrors.forbidden('Producer belongs to another call room');
    const producer = producers.get(producerId); if (!producer) throw app.httpErrors.notFound('SFU producer not found');
    const router = await getRouter(roomId);
    if (!router.canConsume({ producerId, rtpCapabilities: body.rtpCapabilities })) throw app.httpErrors.badRequest('Producer cannot be consumed by this client');
    const consumer = await transport.consume({ producerId, rtpCapabilities: body.rtpCapabilities, paused: true });
    consumers.set(consumer.id, consumer);
    const cleanup = () => consumers.delete(consumer.id);
    consumer.on('transportclose', cleanup); consumer.on('producerclose', cleanup);
    return { id: consumer.id, producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters, type: consumer.type, producerPaused: consumer.producerPaused };
  });

  app.post('/api/sfu/consumer/:id/resume', { preHandler: [app.authenticate] }, async request => { const c = consumers.get(String((request.params as any).id)); if (!c) throw app.httpErrors.notFound('Consumer not found'); await c.resume(); return { ok: true }; });
  app.get('/api/sfu/health', async () => ({ ok: Boolean(worker && !worker.closed), workers: worker && !worker.closed ? 1 : 0, rooms: [...routers.keys()], transports: transports.size, producers: producers.size, consumers: consumers.size, rtcPortRange: `${process.env.MEDIASOUP_RTC_MIN_PORT ?? 40000}-${process.env.MEDIASOUP_RTC_MAX_PORT ?? 49999}` }));
}
