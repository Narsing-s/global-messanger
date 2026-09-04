const PREFIX = 'gm:e2ee:v1:';

const configuredApi = (window as any).__GM_CONFIG__?.API_URL || (import.meta as any).env?.VITE_API_URL;
const API = configuredApi || ((import.meta as any).env?.DEV ? window.location.origin : 'https://global-messanger-backend.onrender.com');

type Identity = { publicKey: JsonWebKey; privateKey: JsonWebKey; version: 1 };
type KeyBundle = { userId: string; publicKey: JsonWebKey | null };
const IDENTITY_PREFIX = 'gm_e2ee_identity_v1';
let identityPromise: Promise<Identity> | null = null;
let identityUserId: string | null = null;
let identityRegistrationPromise: Promise<void> | null = null;
let registeredUserId: string | null = null;
const conversationKeyCache = new Map<string, Promise<KeyBundle[]>>();
const derivedKeyCache = new Map<string, Promise<CryptoKey>>();
const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let result = '';
  for (let i = 0; i < bytes.length; i += 0x8000) result += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(result);
}
function b64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function identityStorageKey(userId: string) {
  return `${IDENTITY_PREFIX}:${userId}`;
}

async function getIdentity(): Promise<Identity> {
  let me: any = null;
  try { me = JSON.parse(localStorage.getItem('gm_user') || 'null'); } catch {}
  const userId = String(me?.id || 'anonymous');
  if (identityPromise && identityUserId === userId) return identityPromise;
  identityUserId = userId;
  identityPromise = (async () => {
    const accountKey = identityStorageKey(userId);
    try {
      const saved = localStorage.getItem(accountKey) || (userId !== 'anonymous' ? localStorage.getItem(IDENTITY_PREFIX) : null);
      if (saved) {
        if (!localStorage.getItem(accountKey) && userId !== 'anonymous') localStorage.setItem(accountKey, saved);
        return JSON.parse(saved) as Identity;
      }
    } catch {}
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const privateKey = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const identity: Identity = { publicKey, privateKey, version: 1 };
    if (userId !== 'anonymous') localStorage.setItem(accountKey, JSON.stringify(identity));
    return identity;
  })();
  return identityPromise;
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gm_token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
}

async function registerIdentity() {
  const token = localStorage.getItem('gm_token');
  let me: any = null;
  try { me = JSON.parse(localStorage.getItem('gm_user') || 'null'); } catch {}
  const userId = String(me?.id || '');
  if (!token || !userId) return;
  if (registeredUserId === userId && identityRegistrationPromise) return identityRegistrationPromise;
  const identity = await getIdentity();
  registeredUserId = userId;
  identityRegistrationPromise = (async () => {
    const response = await authFetch('/api/crypto/identity', { method: 'PUT', body: JSON.stringify({ publicKey: identity.publicKey, version: 1 }) });
    if (!response.ok) throw new Error('Encryption key registration failed');
  })();
  try { await identityRegistrationPromise; } catch (error) { identityRegistrationPromise = null; registeredUserId = null; throw error; }
}

async function conversationKeys(conversationId: string): Promise<KeyBundle[]> {
  const cached = conversationKeyCache.get(conversationId);
  if (cached) return cached;
  const pending = (async () => {
    const response = await authFetch(`/api/conversations/${encodeURIComponent(conversationId)}/crypto-keys`);
    if (!response.ok) throw new Error('Encryption keys unavailable');
    const value = await response.json();
    return Array.isArray(value?.keys) ? value.keys : [];
  })();
  conversationKeyCache.set(conversationId, pending);
  try { return await pending; } catch (error) { conversationKeyCache.delete(conversationId); throw error; }
}

async function deriveAesKey(privateJwk: JsonWebKey, publicJwk: JsonWebKey, conversationId: string) {
  const cacheKey = `${conversationId}:${JSON.stringify(publicJwk)}`;
  const cached = derivedKeyCache.get(cacheKey);
  if (cached) return cached;
  const pending = (async () => {
    const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const publicKey = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode(`global-messenger:${conversationId}`), info: enc.encode('gm-e2ee-v1') }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  })();
  derivedKeyCache.set(cacheKey, pending);
  try { return await pending; } catch (error) { derivedKeyCache.delete(cacheKey); throw error; }
}

export async function encryptMessage(conversationId: string, plaintext: string) {
  const me = JSON.parse(localStorage.getItem('gm_user') || 'null');
  if (!me?.id || !plaintext) return plaintext;
  await registerIdentity();
  const identity = await getIdentity();
  const recipients = (await conversationKeys(conversationId)).filter(item => item.publicKey);
  if (!recipients.length) return plaintext;
  const allRecipients: KeyBundle[] = [{ userId: me.id, publicKey: identity.publicKey }, ...recipients.filter(item => item.userId !== me.id)];
  const entries: Record<string, { iv: string; ct: string }> = {};
  await Promise.all(allRecipients.map(async recipient => {
    const key = await deriveAesKey(identity.privateKey, recipient.publicKey!, conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    entries[recipient.userId] = { iv: bytesToB64(iv), ct: bytesToB64(ciphertext) };
  }));
  return PREFIX + JSON.stringify({ v: 1, senderId: me.id, senderKey: identity.publicKey, entries });
}

export async function decryptMessage(conversationId: string, body: string) {
  if (!body.startsWith(PREFIX)) return body;
  try {
    const envelope = JSON.parse(body.slice(PREFIX.length));
    const me = JSON.parse(localStorage.getItem('gm_user') || 'null');
    const entry = envelope?.entries?.[me?.id];
    if (envelope?.v !== 1 || !envelope?.senderKey || !entry) return '🔒 Encrypted message (not available on this device)';
    const identity = await getIdentity();
    const key = await deriveAesKey(identity.privateKey, envelope.senderKey, conversationId);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(entry.iv) }, key, b64ToBytes(entry.ct));
    return dec.decode(plaintext);
  } catch (error) {
    console.warn('[Global Messenger E2EE] decrypt failed', error);
    return '🔒 Unable to decrypt this message';
  }
}

export async function initE2EE() {
  if (!localStorage.getItem('gm_token')) return;
  try { await registerIdentity(); } catch (error) { console.warn('[Global Messenger E2EE] initialization deferred', error); }
}

export { PREFIX, IDENTITY_PREFIX };
