import { io } from 'socket.io-client';

const BASE = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || 15000);
const latencyBudgetMs = Number(process.env.E2E_LATENCY_BUDGET_MS || 3000);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const json = value => JSON.stringify(value);

async function request(path, { token, method = 'GET', body, expected = [200] } = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: body === undefined ? undefined : json(body)
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    const ms = Math.round(performance.now() - started);
    if (!expected.includes(response.status)) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
    if (ms > latencyBudgetMs && !path.includes('/health') && !path.includes('/ready')) console.warn(`SLOW ${method} ${path}: ${ms}ms (budget ${latencyBudgetMs}ms)`);
    return { data, ms };
  } finally {
    clearTimeout(timer);
  }
}

function unique(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20);
}

async function register(username) {
  const { data } = await request('/api/auth/register', {
    method: 'POST',
    body: { username, displayName: username, password: 'GlobalMessenger!123' },
    expected: [201]
  });
  return data;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'], reconnection: false, timeout: timeoutMs });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Socket connection timed out')); }, timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('connect_error', error => { clearTimeout(timer); socket.disconnect(); reject(error); });
  });
}

function waitForMessage(socket, predicate, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} was not received within timeout`)), timeoutMs);
    const handler = message => {
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message:new', handler);
      resolve(message);
    };
    socket.on('message:new', handler);
  });
}

function waitForAck(socket, clientId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`message:ack for ${clientId} was not received`)), timeoutMs);
    const handler = data => {
      if (data?.clientId !== clientId) return;
      clearTimeout(timer);
      socket.off('message:ack', handler);
      resolve(data);
    };
    socket.on('message:ack', handler);
  });
}

const failures = [];
let socketA;
let socketB;
try {
  const health = await request('/health');
  if (!health.data?.ok) throw new Error('Health endpoint did not return ok=true');
  const ready = await request('/ready');
  if (!ready.data?.ready) throw new Error('Readiness endpoint did not return ready=true');

  const userA = await register(unique('e2ea'));
  const userB = await register(unique('e2eb'));
  const loginA = await request('/api/auth/login', { method: 'POST', body: { username: userA.user.username, password: 'GlobalMessenger!123' } });
  const loginB = await request('/api/auth/login', { method: 'POST', body: { username: userB.user.username, password: 'GlobalMessenger!123' } });
  const tokenA = loginA.data.token;
  const tokenB = loginB.data.token;

  const badLogin = await request('/api/auth/login', { method: 'POST', body: { username: userA.user.username, password: 'wrong-password' }, expected: [401] });
  if (badLogin.data?.token) throw new Error('Invalid login unexpectedly returned a token');

  const search = await request(`/api/users/search?q=${encodeURIComponent(userB.user.username)}`, { token: tokenA });
  if (!Array.isArray(search.data) || !search.data.some(item => item.id === userB.user.id)) throw new Error('User search did not find the second test user');

  const direct = await request('/api/conversations/direct', { token: tokenA, method: 'POST', body: { userId: userB.user.id }, expected: [200] });
  const conversationId = direct.data.id;
  if (!conversationId) throw new Error('Direct conversation was not created');

  await request('/api/conversations', { token: tokenA });
  await request(`/api/conversations/${conversationId}/messages?limit=20`, { token: tokenA });
  await request(`/api/conversations/${conversationId}/info`, { token: tokenA });
  await request('/api/profile/me', { token: tokenA });

  socketA = await connect(tokenA);
  socketB = await connect(tokenB);
  socketA.emit('conversation:join', conversationId);
  socketB.emit('conversation:join', conversationId);
  await sleep(100);

  const body = `E2E message ${Date.now()}`;
  const clientId = crypto.randomUUID();
  const received = waitForMessage(socketB, message => message?.clientId === clientId || message?.body === body, 'Initial realtime message');
  const ack = waitForAck(socketA, clientId);
  const sentAt = performance.now();
  socketA.emit('message:send', { conversationId, body, type: 'text', clientId });
  const [message] = await Promise.all([received, ack]);
  const realtimeMs = Math.round(performance.now() - sentAt);
  if (realtimeMs > latencyBudgetMs) throw new Error(`Realtime delivery took ${realtimeMs}ms, above ${latencyBudgetMs}ms budget`);
  if (!message?.id) throw new Error('Realtime message had no server id');

  socketB.disconnect();
  await sleep(100);
  socketB = await connect(tokenB);
  socketB.emit('conversation:join', conversationId);
  await sleep(100);
  const reconnectBody = `Reconnect message ${Date.now()}`;
  const reconnectClientId = crypto.randomUUID();
  const reconnectReceived = waitForMessage(socketB, item => item?.clientId === reconnectClientId || item?.body === reconnectBody, 'Post-reconnect message');
  const reconnectAck = waitForAck(socketA, reconnectClientId);
  socketA.emit('message:send', { conversationId, body: reconnectBody, type: 'text', clientId: reconnectClientId });
  await Promise.all([reconnectReceived, reconnectAck]);

  const messageId = message.id;
  await request(`/api/messages/${messageId}`, { token: tokenA, method: 'PATCH', body: { body: `${body} edited` }, expected: [200] });
  await request(`/api/messages/${messageId}/reactions`, { token: tokenA, method: 'POST', body: { emoji: '👍' }, expected: [200, 201] });
  await request(`/api/messages/${messageId}/bookmark`, { token: tokenA, method: 'POST', expected: [200, 201] });
  await request(`/api/conversations/${conversationId}/pins`, { token: tokenA, method: 'POST', body: { messageId }, expected: [200, 201] });
  await request(`/api/conversations/${conversationId}/pins/${messageId}`, { token: tokenA, method: 'DELETE', expected: [200, 204] });
  await request(`/api/messages/${messageId}/bookmark`, { token: tokenA, method: 'DELETE', expected: [200, 204] });
  await request(`/api/messages/${messageId}/reactions`, { token: tokenA, method: 'DELETE', body: { emoji: '👍' }, expected: [200, 204] });
  await request(`/api/messages/${messageId}`, { token: tokenA, method: 'DELETE', expected: [200, 204] });

  const group = await request('/api/conversations/group', { token: tokenA, method: 'POST', body: { title: 'E2E Group', userIds: [userB.user.id] }, expected: [200, 201] });
  if (!group.data?.id) throw new Error('Group creation failed');
  await request(`/api/conversations/${group.data.id}/messages?limit=20`, { token: tokenB });

  console.log(`PASS: release E2E core flow; invalid-login rejection; reconnect; message ack; realtime delivery ${realtimeMs}ms; HTTP smoke budget ${latencyBudgetMs}ms.`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  socketA?.disconnect();
  socketB?.disconnect();
}

if (failures.length) {
  console.error('FAIL: release E2E');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
