import { bytesToB64, b64ToBytes } from './crypto';

const enc = new TextEncoder();
const derivedKeyCache = new Map<string, Promise<CryptoKey>>();

function keyId(value: unknown) { return JSON.stringify(value); }

export async function deriveConversationKey(conversationId: string, privateJwk: JsonWebKey, publicJwk: JsonWebKey, saltBytes: Uint8Array) {
  const cacheKey = `${conversationId}:${JSON.stringify(privateJwk)}:${JSON.stringify(publicJwk)}:${bytesToB64(saltBytes)}`;
  const cached = derivedKeyCache.get(cacheKey);
  if (cached) return cached;
  const pending = (async () => {
    const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const publicKey = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const salt = saltBytes.slice().buffer as ArrayBuffer;
    const info = enc.encode('gm-e2ee-v1').slice().buffer as ArrayBuffer;
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  })();
  derivedKeyCache.set(cacheKey, pending);
  try { return await pending; } catch (error) { derivedKeyCache.delete(cacheKey); throw error; }
}

export async function encryptMessage(conversationId: string, plaintext: string) {
  const identity = await getOrCreateIdentity();
  const peer = await getConversationPeerKey(conversationId);
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveConversationKey(conversationId, identity.privateJwk, peer.publicJwk, saltBytes);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { ciphertext: bytesToB64(new Uint8Array(ciphertext)), iv: bytesToB64(iv), salt: bytesToB64(saltBytes) };
}

export async function decryptMessage(conversationId: string, payload: { ciphertext: string; iv: string; salt: string }) {
  const identity = await getOrCreateIdentity();
  const peer = await getConversationPeerKey(conversationId);
  const saltBytes = b64ToBytes(payload.salt);
  const key = await deriveConversationKey(conversationId, identity.privateJwk, peer.publicJwk, saltBytes);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ciphertext));
  return new TextDecoder().decode(plaintext);
}

async function getOrCreateIdentity(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  const stored = localStorage.getItem('gm_e2ee_identity');
  if (stored) return JSON.parse(stored);
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits', 'deriveKey']);
  const identity = { privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey), publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey) };
  localStorage.setItem('gm_e2ee_identity', JSON.stringify(identity));
  return identity;
}

async function getConversationPeerKey(conversationId: string) {
  const token = localStorage.getItem('gm_token') || '';
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/crypto-keys`, { headers: { authorization: `Bearer ${token}` }, credentials: 'include' });
  if (!response.ok) throw new Error('Unable to load conversation encryption keys');
  const data = await response.json();
  return data.peer || data;
}
