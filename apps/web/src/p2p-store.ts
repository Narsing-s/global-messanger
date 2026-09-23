const DB_NAME = 'global-messenger-p2p-v1';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocal<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type LocalProfile = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
};

export type LocalContact = {
  id: string;
  displayName: string;
  username: string;
  connected: boolean;
  lastSeenAt?: string;
};

export type LocalMessage = {
  id: string;
  peerId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered';
};

export async function getProfile(): Promise<LocalProfile | undefined> {
  return getLocal<LocalProfile>('profile');
}

export async function saveProfile(profile: LocalProfile) {
  await setLocal('profile', profile);
}

export async function getContacts(): Promise<LocalContact[]> {
  return (await getLocal<LocalContact[]>('contacts')) || [];
}

export async function saveContacts(contacts: LocalContact[]) {
  await setLocal('contacts', contacts);
}

export async function getMessages(): Promise<LocalMessage[]> {
  return (await getLocal<LocalMessage[]>('messages')) || [];
}

export async function saveMessages(messages: LocalMessage[]) {
  await setLocal('messages', messages.slice(-5000));
}

export async function clearLocalData() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
