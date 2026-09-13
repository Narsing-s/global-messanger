import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

// Production origins are supplied by WEB_ORIGIN at runtime. Keep only local development in source.
source = source.replace(/process\.env\.WEB_ORIGIN \?\?\s*'[^']*'/, "process.env.WEB_ORIGIN ?? 'http://localhost:5173'");
source = source.replace(/const isHelpCentre =\s*origin === '[^']+';\s*\n\s*return configured\.includes\(origin\) \|\| isLocalDev \|\| isNativeApp \|\| isHelpCentre;/, "return configured.includes(origin) || isLocalDev || isNativeApp;");

if (!source.includes("'/ready'")) {
  const marker = "/* -------------------------------------------------------------------------- */\n/* Validation";
  const readyRoute = `/* -------------------------------------------------------------------------- */\n/* Readiness                                                                  */\n/* -------------------------------------------------------------------------- */\n\napp.get('/ready', async (request, reply) => {\n  try {\n    await prisma.$queryRaw\`SELECT 1\`;\n    return { ok: true, service: 'global-messenger', ready: true, time: new Date().toISOString() };\n  } catch (error) {\n    request.log.error({ error }, 'Readiness database check failed');\n    return reply.code(503).send({ ok: false, service: 'global-messenger', ready: false });\n  }\n});\n\n`;
  if (source.includes(marker)) source = source.replace(marker, readyRoute + marker);
}

fs.writeFileSync(file, source);
console.log('Production hardening patch applied successfully.');
