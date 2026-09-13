import { Device } from 'mediasoup-client';
import type { Producer, Transport } from 'mediasoup-client/types';

const api = () => window.__GM_CONFIG__?.API_URL || location.origin;
const token = () => localStorage.getItem('gm_token') || '';

async function call(path: string, options: RequestInit = {}) {
  const r = await fetch(api() + path, {
    ...options,
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

type RemoteTrackHandler = (stream: MediaStream, producerId: string) => void;

export class GlobalMessengerSfuClient {
  device = new Device();
  sendTransport: any = null;
  recvTransport: any = null;
  roomId = '';
  private consumed = new Set<string>();
  private onRemoteTrack: RemoteTrackHandler | null = null;

  setRemoteTrackHandler(handler: RemoteTrackHandler) { this.onRemoteTrack = handler; }

  async join(roomId: string) {
    this.roomId = roomId;
    const caps = await call(`/api/sfu/${encodeURIComponent(roomId)}/capabilities`);
    await this.device.load({ routerRtpCapabilities: caps.routerRtpCapabilities });
    return this.device.rtpCapabilities;
  }

  async createTransport(direction: 'send' | 'recv') {
    const info = await call(`/api/sfu/${encodeURIComponent(this.roomId)}/transport`, {
      method: 'POST', body: JSON.stringify({ direction })
    });
    const transport: any = direction === 'send'
      ? this.device.createSendTransport(info)
      : this.device.createRecvTransport(info);

    transport.on('connect', async ({ dtlsParameters }: any, callback: () => void, errback: (e: Error) => void) => {
      try {
        await call(`/api/sfu/transport/${transport.id}/connect`, { method: 'POST', body: JSON.stringify({ dtlsParameters }) });
        callback();
      } catch (e) { errback(e as Error); }
    });

    if (direction === 'send') {
      transport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: (x: { id: string }) => void, errback: (e: Error) => void) => {
        try {
          const result = await call(`/api/sfu/transport/${transport.id}/produce`, {
            method: 'POST', body: JSON.stringify({ kind, rtpParameters, appData })
          });
          callback({ id: result.id });
        } catch (e) { errback(e as Error); }
      });
      this.sendTransport = transport;
    } else {
      this.recvTransport = transport;
    }
    return transport;
  }

  async produceTrack(track: MediaStreamTrack, appData: Record<string, unknown> = {}) {
    if (!this.sendTransport) await this.createTransport('send');
    return this.sendTransport.produce({ track, appData });
  }

  async consumeProducer(producerId: string) {
    if (this.consumed.has(producerId)) return null;
    if (!this.recvTransport) await this.createTransport('recv');
    const data = await call(`/api/sfu/transport/${this.recvTransport.id}/consume`, {
      method: 'POST',
      body: JSON.stringify({ producerId, rtpCapabilities: this.device.rtpCapabilities })
    });
    const consumer = await this.recvTransport.consume({
      id: data.id, producerId: data.producerId, kind: data.kind, rtpParameters: data.rtpParameters
    });
    await call(`/api/sfu/consumer/${encodeURIComponent(consumer.id)}/resume`, { method: 'POST' });
    this.consumed.add(producerId);
    const stream = new MediaStream([consumer.track]);
    this.onRemoteTrack?.(stream, producerId);
    consumer.on('transportclose', () => this.consumed.delete(producerId));
    consumer.on('trackended', () => this.consumed.delete(producerId));
    return consumer;
  }

  async consumeExistingProducers() {
    const result = await this.getProducers();
    for (const producerId of result.producerIds || []) {
      try { await this.consumeProducer(producerId); } catch (error) { console.warn('SFU consume failed', producerId, error); }
    }
    return result.producerIds || [];
  }

  async getProducers() {
    return call(`/api/sfu/${encodeURIComponent(this.roomId)}/producers`);
  }

  async leave() {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    this.consumed.clear();
    this.roomId = '';
  }
}

(window as any).gmSFU = { GlobalMessengerSfuClient };
