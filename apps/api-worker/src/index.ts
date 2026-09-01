export interface Env {
  UPSTREAM_API: string;
  ALLOWED_ORIGIN: string;
}

function corsHeaders(origin: string | null, allowedOrigin: string): HeadersInit {
  const allowOrigin = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const incomingUrl = new URL(request.url);
    const upstreamBase = env.UPSTREAM_API.replace(/\/$/, "");
    const upstreamUrl = `${upstreamBase}${incomingUrl.pathname}${incomingUrl.search}`;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    // Keep Socket.IO/WebSocket upgrades working while the API is migrated.
    const isUpgrade = request.headers.get("Upgrade")?.toLowerCase() === "websocket";

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    Object.entries(cors).forEach(([key, value]) => responseHeaders.set(key, value));

    // WebSocket responses must retain the 101 response and its WebSocket body.
    if (isUpgrade && upstreamResponse.status === 101) {
      return new Response(upstreamResponse.body, {
        status: 101,
        headers: responseHeaders,
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
