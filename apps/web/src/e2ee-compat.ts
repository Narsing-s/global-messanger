import { decryptMessage } from './e2ee';

const PREFIX = 'gm:e2ee:v1:';
const API = ((window as any).__GM_CONFIG__?.API_URL || (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV && window.location.origin || 'https://global-messanger-backend.onrender.com');
const cache = new Map<string, Promise<string>>();
const keyCache = new Map<string, Promise<CryptoKey>>();
const enc = new TextEncoder();
const dec = new TextDecoder();

type Identity = { privateKey: JsonWebKey };
type KeyBundle = { userId: string; publicKey: JsonWebKey | null };

function b64(value: string) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out; }
function identityKey(userId: string) { return `gm_e2ee_identity_v1:${userId}`; }
function getIdentity(): Identity | null {
  try {
    const me = JSON.parse(localStorage.getItem('gm_user') || 'null');
    const saved = me?.id ? localStorage.getItem(identityKey(String(me.id))) || localStorage.getItem('gm_e2ee_identity_v1') : null;
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}
async function derive(privateJwk: JsonWebKey, publicJwk: JsonWebKey, conversationId: string) {
  const cacheKey = `${conversationId}:${JSON.stringify(publicJwk)}`;
  const hit = keyCache.get(cacheKey); if (hit) return hit;
  const pending = (async () => {
    const priv = await crypto.subtle.importKey('jwk', privateJwk, {name:'ECDH',namedCurve:'P-256'}, false, ['deriveBits']);
    const pub = await crypto.subtle.importKey('jwk', publicJwk, {name:'ECDH',namedCurve:'P-256'}, false, []);
    const shared = await crypto.subtle.deriveBits({name:'ECDH',public:pub}, priv, 256);
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:enc.encode(`global-messenger:${conversationId}`),info:enc.encode('gm-e2ee-v1')}, hkdf, {name:'AES-GCM',length:256}, false, ['decrypt']);
  })();
  keyCache.set(cacheKey,pending); try{return await pending;}catch(e){keyCache.delete(cacheKey);throw e;}
}
async function keys(conversationId: string): Promise<KeyBundle[]> {
  const token = localStorage.getItem('gm_token');
  const response = await fetch(`${API}/api/conversations/${encodeURIComponent(conversationId)}/crypto-keys`, {headers: token ? {Authorization:`Bearer ${token}`} : {}});
  if (!response.ok) throw new Error('Encryption keys unavailable');
  const value = await response.json();
  return Array.isArray(value?.keys) ? value.keys : [];
}
async function legacyDecrypt(conversationId: string, body: string) {
  const envelope = JSON.parse(body.slice(PREFIX.length));
  const identity = getIdentity();
  if (!identity || envelope?.v !== 1 || !envelope?.senderKey) return '🔒 Encrypted message (not available on this device)';

  // Legacy v1 envelopes contain the sender public key. ECDH must always use
  // the current user's private key + the sender's public key; using a
  // recipient's public key here produces a different shared secret and makes
  // otherwise valid historical messages look undecryptable.
  const entry = envelope?.entries?.[JSON.parse(localStorage.getItem('gm_user') || 'null')?.id];
  if (!entry) return '🔒 Encrypted message (not available on this device)';
  try {
    const key = await derive(identity.privateKey, envelope.senderKey, conversationId);
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(entry.iv)}, key, b64(entry.ct));
    return dec.decode(plain);
  } catch {}

  // Compatibility fallback for older envelopes that may have a recipient
  // entry under another currently registered user id. Keep this read-only;
  // never rewrite or re-store message contents.
  const recipients = await keys(conversationId);
  for (const recipient of recipients) {
    const candidate = recipient?.userId ? envelope?.entries?.[recipient.userId] : null;
    if (!candidate || !recipient?.publicKey) continue;
    try {
      const key = await derive(identity.privateKey, envelope.senderKey, conversationId);
      const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(candidate.iv)}, key, b64(candidate.ct));
      return dec.decode(plain);
    } catch {}
  }
  return '🔒 Encrypted message (not available on this device)';
}

export async function decryptMessageCompat(conversationId: string, body: string) {
  if (typeof body !== 'string' || !body.startsWith(PREFIX)) return body;
  const key = `${conversationId}:${body}`;
  const hit = cache.get(key); if (hit) return hit;
  const pending = (async () => {
    const normal = await decryptMessage(conversationId, body);
    if (!normal.startsWith('🔒 Encrypted message (not available') && !normal.startsWith('🔒 Unable to decrypt')) return normal;
    return legacyDecrypt(conversationId, body);
  })();
  cache.set(key,pending); try{return await pending;}catch{return '🔒 Encrypted message (not available on this device)';}
}
