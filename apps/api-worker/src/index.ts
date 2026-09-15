export interface Env {
  UPSTREAM_API: string;
  ALLOWED_ORIGIN: string;
}

const TRUSTED_PUBLIC_ORIGINS = [
  "https://globalmessenger.com",
  "https://www.globalmessenger.com",
  "https://global-messenger-web.narsingbeesetti006.workers.dev",
  "https://global-messenger-help-centre.onrender.com",
];

function corsHeaders(origin: string | null, allowedOrigins: string): HeadersInit {
  const configured = allowedOrigins.split(',').map(value => value.trim()).filter(Boolean);
  const trusted = [...new Set([...configured, ...TRUSTED_PUBLIC_ORIGINS])];
  const allowOrigin = origin && trusted.includes(origin) ? origin : (trusted[0] || '*');
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
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

    if (!env.UPSTREAM_API) {
      return new Response(JSON.stringify({ ok: false, error: "API backend is not configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const incomingUrl = new URL(request.url);
    const upstreamBase = env.UPSTREAM_API.replace(/\/$/, "");
    const upstreamUrl = `${upstreamBase}${incomingUrl.pathname}${incomingUrl.search}`;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("origin");
    headers.delete("referer");

    const isUpgrade = request.headers.get("Upgrade")?.toLowerCase() === "websocket";

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    Object.entries(cors).forEach(([key, value]) => responseHeaders.set(key, value));

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
