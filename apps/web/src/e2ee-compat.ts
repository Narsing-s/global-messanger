import { decryptMessage } from './e2ee';

const PREFIX = 'gm:e2ee:v1:';
const API = ((window as any).__GM_CONFIG__?.API_URL || (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV && window.location.origin || 'https://global-messanger-backend.onrender.com');
const cache = new Map<string, Promise<string>>();
const keyCache = new Map<string, Promise<CryptoKey>>();
const enc = new TextEncoder();
const dec = new TextDecoder();

type Identity = { publicKey?: JsonWebKey; privateKey: JsonWebKey; version?: 1 };
type KeyBundle = { userId: string; publicKey: JsonWebKey | null };

function b64(value: string) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out; }
function identityKey(userId: string) { return `gm_e2ee_identity_v1:${userId}`; }
function getIdentityCandidates(): Identity[] {
  const out: Identity[] = [];
  const seen = new Set<string>();
  try {
    for (let i=0;i<localStorage.length;i++) {
      const key = localStorage.key(i);
      if (!key || (key !== 'gm_e2ee_identity_v1' && !key.startsWith('gm_e2ee_identity_v1:'))) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const identity = JSON.parse(raw) as Identity;
      if (!identity?.privateKey) continue;
      const fingerprint = JSON.stringify(identity.publicKey || identity.privateKey);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      out.push(identity);
    }
  } catch {}
  try {
    const me = JSON.parse(localStorage.getItem('gm_user') || 'null');
    if (me?.id) {
      const raw = localStorage.getItem(identityKey(String(me.id)));
      if (raw) {
        const identity = JSON.parse(raw) as Identity;
        const fingerprint = JSON.stringify(identity.publicKey || identity.privateKey);
        if (identity?.privateKey && !seen.has(fingerprint)) out.unshift(identity);
      }
    }
  } catch {}
  return out;
}

async function derive(privateJwk: JsonWebKey, publicJwk: JsonWebKey, conversationId: string) {
  const cacheKey = `${conversationId}:${JSON.stringify(privateJwk)}:${JSON.stringify(publicJwk)}`;
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
  const me = JSON.parse(localStorage.getItem('gm_user') || 'null');
  const entry = envelope?.entries?.[me?.id];
  if (envelope?.v !== 1 || !envelope?.senderKey || !entry?.iv || !entry?.ct) return '🔒 Encrypted message (not available on this device)';

  // Try every identity still retained locally. This is important when a
  // browser/account was migrated to a new key while old private keys remain
  // locally available. No private key is ever sent to the server.
  for (const identity of getIdentityCandidates()) {
    try {
      const key = await derive(identity.privateKey, envelope.senderKey, conversationId);
      const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(entry.iv)}, key, b64(entry.ct));
      return dec.decode(plain);
    } catch {}
  }

  // Keep the legacy recipient-id compatibility path read-only. It can help
  // with envelopes created by older client versions without changing data.
  try {
    const recipients = await keys(conversationId);
    for (const recipient of recipients) {
      const candidate = recipient?.userId ? envelope?.entries?.[recipient.userId] : null;
      if (!candidate?.iv || !candidate?.ct || !recipient?.publicKey) continue;
      for (const identity of getIdentityCandidates()) {
        try {
          const key = await derive(identity.privateKey, envelope.senderKey, conversationId);
          const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(candidate.iv)}, key, b64(candidate.ct));
          return dec.decode(plain);
        } catch {}
      }
    }
  } catch {}
  return '🔒 Encrypted message (not available on this device)';
}

export async function decryptMessageCompat(conversationId: string, body: string) {
  if (typeof body !== 'string' || !body.startsWith(PREFIX)) return body;
  const key = `${conversationId}:${body}`;
  const hit = cache.get(key); if (hit) return hit;
  const pending = (async () => {
    try {
      const normal = await decryptMessage(conversationId, body);
      if (!normal.startsWith('🔒 Encrypted message (not available') && !normal.startsWith('🔒 Unable to decrypt')) return normal;
    } catch {}
    try { return await legacyDecrypt(conversationId, body); }
    catch { return '🔒 Encrypted message (not available on this device)'; }
  })();
  cache.set(key,pending);
  try { return await pending; }
  catch {
    cache.delete(key);
    return '🔒 Encrypted message (not available on this device)';
  }
}
