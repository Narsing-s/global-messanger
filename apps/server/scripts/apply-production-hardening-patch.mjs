import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

// Keep the source fallback production-safe. Render supplies WEB_ORIGIN explicitly,
// but the fallback must never advertise an unrelated preview/worker origin.
source = source.replace(
  "'http://localhost:5173,https://web.narsingbeesetti006.workers.dev,https://global-messenger-help-centre.onrender.com'",
  "'http://localhost:5173,https://global-messanger.onrender.com,https://global-messenger-help-centre.onrender.com'"
);

// Add a database-aware readiness probe exactly once. /health remains a cheap liveness probe.
if (!source.includes("'/ready'")) {
  const marker = "/* -------------------------------------------------------------------------- */\n/* Validation";
  const readyRoute = `/* -------------------------------------------------------------------------- */\n/* Readiness                                                                  */\n/* -------------------------------------------------------------------------- */\n\napp.get('/ready', async (request, reply) => {\n  try {\n    await prisma.$queryRaw\`SELECT 1\`;\n    return { ok: true, service: 'global-messenger', ready: true, time: new Date().toISOString() };\n  } catch (error) {\n    request.log.error({ error }, 'Readiness database check failed');\n    return reply.code(503).send({ ok: false, service: 'global-messenger', ready: false });\n  }\n});\n\n`;
  if (source.includes(marker)) source = source.replace(marker, readyRoute + marker);
}

fs.writeFileSync(file, source);
console.log('Production hardening patch applied successfully.');
