import { Device } from 'mediasoup-client';

const api = () => window.__GM_CONFIG__?.API_URL || location.origin;
const token = () => localStorage.getItem('gm_token') || '';
async function call(path:string, options:RequestInit={}){const r=await fetch(api()+path,{...options,headers:{'content-type':'application/json',Authorization:`Bearer ${token()}`,...(options.headers||{})}});if(!r.ok)throw new Error(await r.text());return r.json();}

export class GlobalMessengerSfuClient {
  device = new Device(); sendTransport:any; recvTransport:any; roomId='';
  async join(roomId:string){this.roomId=roomId;const caps=await call(`/api/sfu/${encodeURIComponent(roomId)}/capabilities`);await this.device.load({routerRtpCapabilities:caps.routerRtpCapabilities});return this.device.rtpCapabilities;}
  async createTransport(direction:'send'|'recv'){const info=await call(`/api/sfu/${encodeURIComponent(this.roomId)}/transport`,{method:'POST',body:JSON.stringify({direction})});const transport=direction==='send'?this.device.createSendTransport(info):this.device.createRecvTransport(info);if(direction==='send')this.sendTransport=transport;else this.recvTransport=transport;return transport;}
  async getProducers(){return call(`/api/sfu/${encodeURIComponent(this.roomId)}/producers`);}
  async leave(){this.sendTransport?.close();this.recvTransport?.close();this.sendTransport=null;this.recvTransport=null;}
}
(window as any).gmSFU={GlobalMessengerSfuClient};
