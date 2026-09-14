import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const index = path.join(root, 'apps/server/src/index.ts');
const advanced = path.join(root, 'apps/server/src/advanced.ts');

if (!fs.existsSync(index) || !fs.existsSync(advanced)) process.exit(0);

let source = fs.readFileSync(index, 'utf8');
const guard = '/* session-security-v1 */';

if (!source.includes(guard)) {
  if (!source.includes("import crypto from 'node:crypto';")) {
    source = source.replace("import path from 'node:path';", "import path from 'node:path';\nimport crypto from 'node:crypto';");
  }

  const authAnchor = "  async (request: any) => {\n    await request.jwtVerify();\n  }"
  const authReplacement = `  async (request: any) => {\n    await request.jwtVerify();\n\n    ${guard}\n    // JWTs are also bound to a server-side session so logout/revocation is effective immediately.\n    const authorization = String(request.headers?.authorization ?? '');\n    const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';\n    if (!bearer) throw app.httpErrors.unauthorized('Authentication token is required');\n    const tokenHash = crypto.createHash('sha256').update(bearer).digest('hex');\n    const session = await prisma.userSession.findUnique({\n      where: { tokenHash },\n      select: { id: true, userId: true, revokedAt: true, expiresAt: true }\n    });\n    if (!session || session.revokedAt || (session.expiresAt && session.expiresAt <= new Date())) {\n      throw app.httpErrors.unauthorized('Session is expired or revoked');\n    }\n    if (session.userId !== String(request.user?.id ?? '')) {\n      throw app.httpErrors.unauthorized('Invalid session');\n    }\n    await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });\n  }`;

  if (!source.includes(authAnchor)) throw new Error('Session patch: authenticate anchor not found');
  source = source.replace(authAnchor, authReplacement);

  // Replace the two normal login/register token issuances with session-backed issuance.
  const tokenBlock = `    const token = app.jwt.sign({\n      id: user.id,\n      username: user.username\n    });`;
  const sessionBlock = `    const token = app.jwt.sign({\n      id: user.id,\n      username: user.username\n    });\n\n    await prisma.userSession.create({\n      data: {\n        userId: user.id,\n        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),\n        deviceName: String(request.headers?.['x-device-name'] ?? 'Web'),\n        platform: String(request.headers?.['x-platform'] ?? 'web'),\n        userAgent: String(request.headers?.['user-agent'] ?? '').slice(0, 1000),\n        ipAddress: String(request.ip ?? '').slice(0, 128),\n        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)\n      }\n    });`;
  if (!source.includes(tokenBlock)) throw new Error('Session patch: token issuance anchor not found');
  source = source.replaceAll(tokenBlock, sessionBlock);

  fs.writeFileSync(index, source);
  console.log('[Production] server-side session security patch applied');
}

let advancedSource = fs.readFileSync(advanced, 'utf8');
const importLine = "import { registerSessionSecurity } from './session-security.js';";
if (!advancedSource.includes(importLine)) {
  advancedSource = advancedSource.replace("import { registerGlobalCompletionRoutes } from './global-completion.js';", "import { registerGlobalCompletionRoutes } from './global-completion.js';\n" + importLine);
}
if (!advancedSource.includes('await registerSessionSecurity(app, prisma);')) {
  advancedSource = advancedSource.replace('  await registerGlobalCompletionRoutes(app, prisma);', '  await registerGlobalCompletionRoutes(app, prisma);\n  await registerSessionSecurity(app, prisma);');
}
fs.writeFileSync(advanced, advancedSource);
console.log('[Production] session management routes registered');
