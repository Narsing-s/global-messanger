import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.resolve(root, 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

const importLine = "import crypto from 'node:crypto';";
const injectedImport = "import crypto from 'node:crypto';";

if (!source.includes(injectedImport)) {
  source = source.replace("import fs from 'node:fs/promises';", `import fs from 'node:fs/promises';\n${injectedImport}`);
}

const marker = "/* -------------------------------------------------------------------------- */\n/* Plugins                                                                    */\n/* -------------------------------------------------------------------------- */";
const securityBlock = `

/* -------------------------------------------------------------------------- */
/* Production security                                                        */
/* -------------------------------------------------------------------------- */

const securityWindowMs = 60_000;
const generalLimit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120);
const authLimit = Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? 12);
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const securityRateLimit = async (request: any, reply: any) => {
  if (request.url === '/health' || request.url === '/') return;
  const pathname = String(request.url || '').split('?')[0];
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const limit = isAuthRoute ? authLimit : generalLimit;
  const now = Date.now();
  const key = \\`${isAuthRoute ? 'auth' : 'api'}:\\${request.ip || 'unknown'}\\`;
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= securityWindowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    reply.header('X-RateLimit-Limit', String(limit));
    reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - 1)));
    return;
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  reply.header('X-RateLimit-Limit', String(limit));
  reply.header('X-RateLimit-Remaining', String(remaining));
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((securityWindowMs - (now - bucket.startedAt)) / 1000));
    reply.header('Retry-After', String(retryAfter));
    return reply.code(429).send({ message: 'Too many requests. Please try again shortly.' });
  }
};

app.addHook('onRequest', securityRateLimit);
app.addHook('onSend', async (_request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  reply.header('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.NODE_ENV === 'production') reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return payload;
});
`;

if (!source.includes('const securityWindowMs = 60_000;')) {
  source = source.replace(marker, securityBlock + '\n' + marker);
}

const healthMarker = "app.get(\n  '/health',\n  async () => {\n    return {\n      ok: true,\n      service: 'global-messenger',\n      time: new Date().toISOString()\n    };\n  }\n);";
const healthReplacement = "app.get(\n  '/health',\n  async (_request, reply) => {\n    try {\n      await prisma.$queryRaw`SELECT 1`;\n      return { ok: true, service: 'global-messenger', database: 'ok', time: new Date().toISOString() };\n    } catch (error) {\n      app.log.error(error, 'Database health check failed');\n      return reply.code(503).send({ ok: false, service: 'global-messenger', database: 'unavailable', time: new Date().toISOString() });\n    }\n  }\n);";
if (source.includes(healthMarker)) source = source.replace(healthMarker, healthReplacement);

fs.writeFileSync(file, source);
