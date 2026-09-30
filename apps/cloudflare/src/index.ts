const DEPLOY_VERSION = "auth-fix-2026-09-30";

interface Env {
  DB: D1Database;
  CHAT_ROOMS: DurableObjectNamespace;
  APP_NAME: string;
  JWT_SECRET?: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });

const id = () => crypto.randomUUID();

function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uText(text: string): string {
  return b64u(new TextEncoder().encode(text));
}

function unb64u(input: string): Uint8Array {
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - input.length % 4) % 4);
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = b64uText(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64uText(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }));
  const data = new TextEncoder().encode(header + "." + body);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), data));
  return header + "." + body + "." + b64u(sig);
}

async function verifyJwt(token: string, secret: string): Promise<any | null> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), unb64u(s), new TextEncoder().encode(h + "." + p));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64u(p)));
    if (Number(payload.exp || 0) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return b64u(new Uint8Array(bits));
}

async function readBody(request: Request) {
  try { return await request.json<any>(); } catch { return {}; }
}

function originHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-credentials": "true",
    "cache-control": "no-store"
  };
}

async function authUser(request: Request, env: Env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const payload = await verifyJwt(token, env.JWT_SECRET || "change-me-before-production");
  return payload?.sub ? String(payload.sub) : null;
}

async function userShape(env: Env, userId: string) {
  return env.DB.prepare("SELECT id, username, display_name AS displayName, avatar_url AS avatarUrl, last_seen_at AS lastSeenAt FROM users WHERE id = ?").bind(userId).first();
}

async function messageShape(env: Env, messageId: string) {
  const m: any = await env.DB.prepare(`SELECT m.id,m.client_id AS clientId,m.conversation_id AS conversationId,m.sender_id AS senderId,m.body,m.type,m.created_at AS createdAt,m.edited_at AS editedAt,m.deleted_at AS deletedAt,
    u.username,u.display_name AS displayName,u.avatar_url AS avatarUrl
    FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).bind(messageId).first();
  if (!m) return null;
  return {...m, sender:{id:m.senderId,username:m.username,displayName:m.displayName,avatarUrl:m.avatarUrl}};
}

async function isMember(env: Env, conversationId: string, userId: string) {
  return !!(await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(conversationId,userId).first());
}

async function broadcast(env: Env, conversationId: string, event: string, data: unknown) {
  const stub = env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(conversationId));
  await stub.fetch("https://chat-room/event", { method:"POST", body: JSON.stringify({ event, data }) });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  if (path === "/" && request.method === "GET") return json({ ok: true, service: "global-messenger-api", status: "online", api: "/api", health: "/api/health", register: "POST /api/auth/register", login: "POST /api/auth/login" }, { headers: originHeaders(request) });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: originHeaders(request) });

  if (path === "/health" || path === "/ready") return json({ ok: true, service: "global-messenger-cloudflare", version: DEPLOY_VERSION, time: new Date().toISOString() }, { headers: originHeaders(request) });

  if (path === "/health/db") {
    try {
      const row: any = await env.DB.prepare("SELECT 1 AS ok").first();
      return json({ ok: row?.ok === 1, database: "D1", status: row?.ok === 1 ? "connected" : "not_ready", time: new Date().toISOString() }, { headers: originHeaders(request) });
    } catch (error) {
      return json({ ok: false, database: "D1", status: "error", message: error instanceof Error ? error.message : "D1 query failed" }, { status: 503, headers: originHeaders(request) });
    }
  }

  // Authentication endpoints are public. A browser GET to these URLs should return
  // an explicit usage message instead of falling through to the protected API routes.
  if ((path === "/auth/register-email" || path === "/auth/register") && request.method === "GET") {
    return json({ ok: true, endpoint: "/api/auth/register", method: "POST", message: "Registration endpoint is public. Send username, displayName, email (optional), and password as JSON." }, { headers: originHeaders(request) });
  }
  if ((path === "/auth/login-email" || path === "/auth/login") && request.method === "GET") {
    return json({ ok: true, endpoint: "/api/auth/login", method: "POST", message: "Login endpoint is public. Send identifier (or username) and password as JSON." }, { headers: originHeaders(request) });
  }

  if (path === "/auth/register-email" || path === "/auth/register") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const displayName = String(body.displayName || username).trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const password = String(body.password || "");
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username) || displayName.length < 1 || password.length < 8) return json({ message: "Username, display name and password are invalid." }, { status: 400, headers: originHeaders(request) });
    const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? OR (? IS NOT NULL AND email = ?)").bind(username, email, email).first();
    if (exists) return json({ message: "Username or email is already registered." }, { status: 409, headers: originHeaders(request) });
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const userId = id();
    const hash = await passwordHash(password, salt);
    await env.DB.prepare("INSERT INTO users (id,username,email,display_name,password_hash,password_salt) VALUES (?,?,?,?,?,?)").bind(userId, username, email, displayName, hash, b64u(salt)).run();
    const token = await signJwt({ sub: userId, username }, env.JWT_SECRET || "change-me-before-production");
    const user = await userShape(env, userId);
    return json({ token, user }, { status: 201, headers: originHeaders(request) });
  }

  if (path === "/auth/login-email" || path === "/auth/login") {
    const body = await readBody(request);
    const identifier = String(body.identifier || body.username || "").trim();
    const password = String(body.password || "");
    const user: any = await env.DB.prepare("SELECT * FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?) LIMIT 1").bind(identifier, identifier).first();
    if (!user) return json({ message: "Invalid username/email or password." }, { status: 401, headers: originHeaders(request) });
    const salt = unb64u(String(user.password_salt));
    const hash = await passwordHash(password, salt);
    if (hash !== String(user.password_hash)) return json({ message: "Invalid username/email or password." }, { status: 401, headers: originHeaders(request) });
    await env.DB.prepare("UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
    const token = await signJwt({ sub: user.id, username: user.username }, env.JWT_SECRET || "change-me-before-production");
    const shaped = await userShape(env, String(user.id));
    return json({ token, user: shaped }, { headers: originHeaders(request) });
  }

  const userId = await authUser(request, env);
  if (!userId) return json({ message: "Authentication required." }, { status: 401, headers: originHeaders(request) });

  if (path === "/auth/logout" && request.method === "POST") {
    return json({ ok: true }, { headers: originHeaders(request) });
  }

  if (path === "/profile/me") {
    const user: any = await env.DB.prepare("SELECT id,username,email,display_name AS displayName,bio,avatar_url AS avatarUrl,last_seen_at AS lastSeenAt,created_at AS createdAt FROM users WHERE id = ?").bind(userId).first();
    return json(user || {}, { headers: originHeaders(request) });
  }

  if (path === "/users/search") {
    const q = String(url.searchParams.get("q") || "").trim();
    const rows = await env.DB.prepare("SELECT id,username,display_name AS displayName,avatar_url AS avatarUrl,last_seen_at AS lastSeenAt FROM users WHERE id <> ? AND (username LIKE ? OR display_name LIKE ?) ORDER BY username LIMIT 30").bind(userId, "%" + q + "%", "%" + q + "%").all();
    return json(rows.results, { headers: originHeaders(request) });
  }

  if (path === "/conversations" && request.method === "GET") {
    const rows = await env.DB.prepare(`SELECT c.id,c.title,c.is_group AS isGroup,c.created_at AS createdAt,c.updated_at AS updatedAt
      FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id
      WHERE m.user_id=? ORDER BY c.updated_at DESC`).bind(userId).all();
    const out = [];
    for (const c of rows.results as any[]) {
      const members = await env.DB.prepare("SELECT u.id,u.username,u.display_name AS displayName,u.avatar_url AS avatarUrl,u.last_seen_at AS lastSeenAt FROM users u JOIN conversation_members m ON m.user_id=u.id WHERE m.conversation_id=?").bind(c.id).all();
      const last = await env.DB.prepare("SELECT id,body,type,sender_id AS senderId,created_at AS createdAt FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1").bind(c.id).first();
      out.push({ ...c, isGroup: !!c.isGroup, members: members.results.map((user:any)=>({user})), messages: last ? [last] : [] });
    }
    return json(out, { headers: originHeaders(request) });
  }

  if (path === "/conversations/direct" && request.method === "POST") {
    const body = await readBody(request);
    const other = String(body.userId || "");
    const found: any = await env.DB.prepare(`SELECT c.id FROM conversations c
      JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=?
      JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=?
      WHERE c.is_group=0 LIMIT 1`).bind(userId, other).first();
    let conversationId = found?.id;
    if (!conversationId) {
      conversationId = id();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO conversations (id,is_group,creator_id) VALUES (?,0,?)").bind(conversationId,userId),
        env.DB.prepare("INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)").bind(conversationId,userId),
        env.DB.prepare("INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)").bind(conversationId,other)
      ]);
    }
    return json({ id: conversationId }, { status: 201, headers: originHeaders(request) });
  }

  const msgMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
  if (msgMatch && request.method === "POST") {
    const conversationId = msgMatch[1];
    const member = await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(conversationId,userId).first();
    if (!member) return json({ message: "Chat not found." }, { status: 404, headers: originHeaders(request) });
    const body = await readBody(request);
    const text = String(body.body || "").trim();
    if (!text) return json({ message: "Message body is required." }, { status: 400, headers: originHeaders(request) });
    const messageId = id();
    await env.DB.prepare("INSERT INTO messages (id,client_id,conversation_id,sender_id,body,type) VALUES (?,?,?,?,?,?)")
      .bind(messageId, body.clientId ? String(body.clientId) : null, conversationId, userId, text, String(body.type || "text")).run();
    await env.DB.prepare("UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(conversationId).run();
    const sender = await userShape(env, userId);
    const message = { id: messageId, clientId: body.clientId || null, conversationId, senderId: userId, body: text, type: body.type || "text", createdAt: new Date().toISOString(), sender };
    await broadcast(env, conversationId, "message:new", message);
    return json(message, { status: 201, headers: originHeaders(request) });
  }

  if (msgMatch && request.method === "GET") {
    const conversationId = msgMatch[1];
    const member = await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(conversationId,userId).first();
    if (!member) return json({ message: "Chat not found." }, { status: 404, headers: originHeaders(request) });
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 100);
    const rows = await env.DB.prepare(`SELECT m.id,m.client_id AS clientId,m.conversation_id AS conversationId,m.sender_id AS senderId,m.body,m.type,m.created_at AS createdAt,
      u.username,u.display_name AS displayName,u.avatar_url AS avatarUrl FROM messages m JOIN users u ON u.id=m.sender_id
      WHERE m.conversation_id=? ORDER BY m.created_at DESC LIMIT ?`).bind(conversationId,limit).all();
    return json((rows.results as any[]).reverse().map(m=>({...m,sender:{id:m.senderId,username:m.username,displayName:m.displayName,avatarUrl:m.avatarUrl}})), { headers: originHeaders(request) });
  }

  const editMatch = path.match(/^\/messages\/([^/]+)$/);
  if (editMatch && request.method === "PATCH") {
    const messageId = editMatch[1];
    const body = await readBody(request);
    const text = String(body.body || "").trim();
    const m: any = await env.DB.prepare("SELECT conversation_id AS conversationId,sender_id AS senderId FROM messages WHERE id=?").bind(messageId).first();
    if (!m || m.senderId !== userId || !(await isMember(env,m.conversationId,userId))) return json({message:"Message not found."},{status:404,headers:originHeaders(request)});
    if (!text) return json({message:"Message body is required."},{status:400,headers:originHeaders(request)});
    await env.DB.prepare("UPDATE messages SET body=?,edited_at=CURRENT_TIMESTAMP WHERE id=?").bind(text,messageId).run();
    const message=await messageShape(env,messageId); await broadcast(env,m.conversationId,"message:updated",message);
    return json(message,{headers:originHeaders(request)});
  }

  if (editMatch && request.method === "DELETE") {
    const messageId=editMatch[1];
    const m:any=await env.DB.prepare("SELECT conversation_id AS conversationId,sender_id AS senderId FROM messages WHERE id=?").bind(messageId).first();
    if (!m || m.senderId !== userId) return json({message:"Message not found."},{status:404,headers:originHeaders(request)});
    await env.DB.prepare("UPDATE messages SET deleted_at=CURRENT_TIMESTAMP,body='' WHERE id=?").bind(messageId).run();
    const message=await messageShape(env,messageId); await broadcast(env,m.conversationId,"message:deleted",message);
    return json(message,{headers:originHeaders(request)});
  }

  const readMatch=path.match(/^\/conversations\/([^/]+)\/read$/);
  if (readMatch && request.method==="POST") {
    const conversationId=readMatch[1];
    if (!(await isMember(env,conversationId,userId))) return json({message:"Chat not found."},{status:404,headers:originHeaders(request)});
    await env.DB.prepare("UPDATE conversation_members SET last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?").bind(conversationId,userId).run();
    await broadcast(env,conversationId,"message:read",{conversationId,userId});
    return json({ok:true,conversationId,userId},{headers:originHeaders(request)});
  }

  const reactionMatch=path.match(/^\/messages\/([^/]+)\/reaction$/);
  if (reactionMatch && request.method==="POST") {
    const messageId=reactionMatch[1]; const body=await readBody(request); const emoji=String(body.emoji||body.reaction||"").trim().slice(0,32);
    const m:any=await env.DB.prepare("SELECT conversation_id AS conversationId FROM messages WHERE id=?").bind(messageId).first();
    if (!m || !(await isMember(env,m.conversationId,userId))) return json({message:"Message not found."},{status:404,headers:originHeaders(request)});
    await env.DB.prepare("DELETE FROM message_reactions WHERE message_id=? AND user_id=?").bind(messageId,userId).run();
    if (emoji) await env.DB.prepare("INSERT INTO message_reactions (message_id,user_id,emoji) VALUES (?,?,?)").bind(messageId,userId,emoji).run();
    const rows=await env.DB.prepare("SELECT user_id AS userId,emoji FROM message_reactions WHERE message_id=?").bind(messageId).all();
    const data={messageId,reactions:rows.results}; await broadcast(env,m.conversationId,"message:reaction",data); return json(data,{headers:originHeaders(request)});
  }

  const bookmarkMatch=path.match(/^\/messages\/([^/]+)\/bookmark$/);
  if (bookmarkMatch && (request.method==="POST" || request.method==="DELETE")) {
    const messageId=bookmarkMatch[1]; const m:any=await env.DB.prepare("SELECT conversation_id AS conversationId FROM messages WHERE id=?").bind(messageId).first();
    if (!m || !(await isMember(env,m.conversationId,userId))) return json({message:"Message not found."},{status:404,headers:originHeaders(request)});
    if(request.method==="POST") await env.DB.prepare("INSERT OR IGNORE INTO bookmarks (user_id,message_id) VALUES (?,?)").bind(userId,messageId).run();
    else await env.DB.prepare("DELETE FROM bookmarks WHERE user_id=? AND message_id=?").bind(userId,messageId).run();
    return json({ok:true},{headers:originHeaders(request)});
  }
  if (path==="/bookmarks" && request.method==="GET") {
    const rows=await env.DB.prepare(`SELECT b.created_at AS createdAt,m.id AS messageId FROM bookmarks b JOIN messages m ON m.id=b.message_id WHERE b.user_id=? ORDER BY b.created_at DESC LIMIT 200`).bind(userId).all();
    const out=[]; for(const row of rows.results as any[]){ const message=await messageShape(env,row.messageId); if(message) out.push({createdAt:row.createdAt,message}); } return json(out,{headers:originHeaders(request)});
  }

  const pinMatch=path.match(/^\/messages\/([^/]+)\/pin$/);
  if(pinMatch && (request.method==="POST" || request.method==="DELETE")){
    const messageId=pinMatch[1]; const m:any=await env.DB.prepare("SELECT conversation_id AS conversationId FROM messages WHERE id=?").bind(messageId).first();
    if(!m || !(await isMember(env,m.conversationId,userId))) return json({message:"Message not found."},{status:404,headers:originHeaders(request)});
    if(request.method==="POST") await env.DB.prepare("INSERT OR IGNORE INTO pinned_messages (conversation_id,message_id,user_id) VALUES (?,?,?)").bind(m.conversationId,messageId,userId).run();
    else await env.DB.prepare("DELETE FROM pinned_messages WHERE conversation_id=? AND message_id=? AND user_id=?").bind(m.conversationId,messageId,userId).run();
    await broadcast(env,m.conversationId,"message:pin",{messageId,pinned:request.method==="POST"}); return json({ok:true},{headers:originHeaders(request)});
  }
  const pinsMatch=path.match(/^\/conversations\/([^/]+)\/pins$/);
  if(pinsMatch && request.method==="GET"){
    const conversationId=pinsMatch[1]; if(!(await isMember(env,conversationId,userId))) return json({message:"Chat not found."},{status:404,headers:originHeaders(request)});
    const rows=await env.DB.prepare("SELECT created_at AS createdAt,message_id AS messageId FROM pinned_messages WHERE conversation_id=? ORDER BY created_at DESC").bind(conversationId).all();
    const out=[]; for(const row of rows.results as any[]){const message=await messageShape(env,row.messageId);if(message)out.push({createdAt:row.createdAt,message});} return json(out,{headers:originHeaders(request)});
  }

  if(path==="/messages/search" && request.method==="GET"){
    const q=String(url.searchParams.get("q")||"").trim(); const limit=Math.min(Number(url.searchParams.get("limit")||50),100);
    const rows=await env.DB.prepare(`SELECT m.id,m.conversation_id AS conversationId FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id WHERE cm.user_id=? AND m.body LIKE ? ORDER BY m.created_at DESC LIMIT ?`).bind(userId,"%"+q+"%",limit).all();
    const out=[]; for(const row of rows.results as any[]){const message=await messageShape(env,row.id);if(message)out.push(message);} return json(out,{headers:originHeaders(request)});
  }

  if (path === "/conversations/group" && request.method === "POST") {
    const body = await readBody(request);
    const title = String(body.title || "Group").trim().slice(0, 120);
    const userIds = Array.isArray(body.userIds) ? body.userIds.map((v:any)=>String(v)).filter(Boolean) : [];
    const unique = Array.from(new Set([userId, ...userIds]));
    if (unique.length < 3) return json({ message: "A group needs at least 3 members." }, { status: 400, headers: originHeaders(request) });
    const conversationId = id();
    const statements = [
      env.DB.prepare("INSERT INTO conversations (id,title,is_group,creator_id) VALUES (?,?,1,?)").bind(conversationId,title,userId),
      ...unique.map(uid=>env.DB.prepare("INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)").bind(conversationId,uid))
    ];
    await env.DB.batch(statements);
    return json({ id: conversationId, title, isGroup: true }, { status: 201, headers: originHeaders(request) });
  }

  if (path === "/conversations" && request.method === "POST") return json({ message: "Use /conversations/direct or group." }, { status: 400, headers: originHeaders(request) });

  const convInfo = path.match(/^\/conversations\/([^/]+)\/info$/);
  if (convInfo) {
    const conversationId = convInfo[1];
    const member = await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(conversationId,userId).first();
    if (!member) return json({ message: "Chat not found." }, { status: 404, headers: originHeaders(request) });
    return json(await env.DB.prepare("SELECT id,title,is_group AS isGroup,created_at AS createdAt,updated_at AS updatedAt FROM conversations WHERE id=?").bind(conversationId).first(), { headers: originHeaders(request) });
  }

  return json({ message: "This Cloudflare API route is not migrated yet.", path }, { status: 501, headers: originHeaders(request) });
}

export class ChatRoom {
  state: DurableObjectState;
  sockets = new Set<WebSocket>();
  constructor(state: DurableObjectState) { this.state = state; }
  async fetch(request: Request) {
    if (request.method === "POST") {
      try {
        const payload:any = await request.json();
        const encoded = JSON.stringify(payload);
        for (const socket of this.sockets) if (socket.readyState === WebSocket.OPEN) socket.send(encoded);
        return new Response("ok");
      } catch { return new Response("bad payload", { status: 400 }); }
    }
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket endpoint", { status: 426 });
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    this.sockets.add(server);
    server.addEventListener("message", event => {
      for (const socket of this.sockets) if (socket !== server && socket.readyState === WebSocket.OPEN) socket.send(String(event.data));
    });
    server.addEventListener("close", () => this.sockets.delete(server));
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/socket.io/")) {
      return new Response("Socket.IO is not used by the Cloudflare backend. The Cloudflare WebSocket endpoint is /ws.", { status: 426 });
    }
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token") || "";
      const payload = await verifyJwt(token, env.JWT_SECRET || "change-me-before-production");
      if (!payload?.sub) return new Response("Authentication required.", {status:401});
      // One hub is used for all transient WebSocket subscriptions; the DO filters events by conversation.
      const stub = env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName("global-hub"));
      return stub.fetch(new Request("https://chat-room/connect", request));
    }
    const response = await handleApi(request, env);
    const headers = new Headers(response.headers);
    Object.entries(originHeaders(request)).forEach(([k,v]) => headers.set(k,v));
    return new Response(response.body, { status: response.status, headers });
  }
};
