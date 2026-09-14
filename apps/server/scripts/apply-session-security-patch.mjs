import fs from 'node:fs';
import path from 'node:path';

// npm workspace scripts normally run with apps/server as cwd, while CI wrappers may
// run from the repository root. Resolve both layouts so this patch is never silently skipped.
const cwd = path.resolve(process.cwd());
const serverRoot = fs.existsSync(path.join(cwd, 'src', 'index.ts')) ? cwd : path.join(cwd, 'apps/server');
const index = path.join(serverRoot, 'src/index.ts');
const advanced = path.join(serverRoot, 'src/advanced.ts');
const emailAuth = path.join(serverRoot, 'src/email-auth-routes.ts');
const securityAuth = path.join(serverRoot, 'src/security-auth.ts');

if (!fs.existsSync(index) || !fs.existsSync(advanced)) {
  throw new Error(`[Production] session security patch could not locate server sources from ${cwd}`);
}

const sessionCreate = (tokenExpr = 'token') => `\n    await prisma.userSession.create({\n      data: {\n        userId: user.id,\n        tokenHash: crypto.createHash('sha256').update(${tokenExpr}).digest('hex'),\n        deviceName: String(request.headers?.['x-device-name'] ?? 'Web'),\n        platform: String(request.headers?.['x-platform'] ?? 'web'),\n        userAgent: String(request.headers?.['user-agent'] ?? '').slice(0, 1000),\n        ipAddress: String(request.ip ?? '').slice(0, 128),\n        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)\n      }\n    });`;

let source = fs.readFileSync(index, 'utf8');
const guard = '/* session-security-v1 */';

if (!source.includes(guard)) {
  if (!source.includes("import crypto from 'node:crypto';")) {
    source = source.replace("import path from 'node:path';", "import path from 'node:path';\nimport crypto from 'node:crypto';");
  }

  const authAnchor = "  async (request: any) => {\n    await request.jwtVerify();\n  }";
  const authReplacement = `  async (request: any) => {\n    await request.jwtVerify();\n\n    ${guard}\n    // JWTs are also bound to a server-side session so logout/revocation is effective immediately.\n    const authorization = String(request.headers?.authorization ?? '');\n    const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';\n    if (!bearer) throw app.httpErrors.unauthorized('Authentication token is required');\n    const tokenHash = crypto.createHash('sha256').update(bearer).digest('hex');\n    const session = await prisma.userSession.findUnique({\n      where: { tokenHash },\n      select: { id: true, userId: true, revokedAt: true, expiresAt: true }\n    });\n    if (!session || session.revokedAt || (session.expiresAt && session.expiresAt <= new Date())) {\n      throw app.httpErrors.unauthorized('Session is expired or revoked');\n    }\n    if (session.userId !== String(request.user?.id ?? '')) {\n      throw app.httpErrors.unauthorized('Invalid session');\n    }\n    await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });\n  }`;

  if (!source.includes(authAnchor)) throw new Error('Session patch: authenticate anchor not found');
  source = source.replace(authAnchor, authReplacement);

  const tokenBlock = `    const token = app.jwt.sign({\n      id: user.id,\n      username: user.username\n    });`;
  const sessionBlock = tokenBlock + sessionCreate();
  const tokenCount = source.split(tokenBlock).length - 1;
  if (tokenCount < 2) throw new Error(`Session patch: expected register/login token issuances, found ${tokenCount}`);
  source = source.replaceAll(tokenBlock, sessionBlock);
  fs.writeFileSync(index, source);
  console.log('[Production] server-side session security applied to username auth');
}

// Register the session routes once.
let advancedSource = fs.readFileSync(advanced, 'utf8');
const importLine = "import { registerSessionSecurity } from './session-security.js';";
if (!advancedSource.includes(importLine)) {
  const anchor = "import { registerGlobalCompletionRoutes } from './global-completion.js';";
  if (!advancedSource.includes(anchor)) throw new Error('Session patch: advanced import anchor not found');
  advancedSource = advancedSource.replace(anchor, anchor + '\n' + importLine);
}
if (!advancedSource.includes('await registerSessionSecurity(app, prisma);')) {
  const anchor = '  await registerGlobalCompletionRoutes(app, prisma);';
  if (!advancedSource.includes(anchor)) throw new Error('Session patch: advanced registration anchor not found');
  advancedSource = advancedSource.replace(anchor, anchor + '\n  await registerSessionSecurity(app, prisma);');
}
fs.writeFileSync(advanced, advancedSource);

// Email/phone login and registration are separate auth routes, so bind their issued JWTs too.
if (fs.existsSync(emailAuth)) {
  let text = fs.readFileSync(emailAuth, 'utf8');
  if (!text.includes('/* session-security-email-v1 */')) {
    if (!text.includes("import crypto from 'node:crypto';")) {
      text = text.replace("import bcrypt from 'bcryptjs';", "import bcrypt from 'bcryptjs';\nimport crypto from 'node:crypto';");
    }
    const block = `    const token = app.jwt.sign({ id: user.id, username: user.username });`;
    const replacement = `${block}\n    /* session-security-email-v1 */\n    await prisma.userSession.create({ data: { userId: user.id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), deviceName: String(request.headers?.['x-device-name'] ?? 'Web'), platform: String(request.headers?.['x-platform'] ?? 'web'), userAgent: String(request.headers?.['user-agent'] ?? '').slice(0, 1000), ipAddress: String(request.ip ?? '').slice(0, 128), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });`;
    if (text.includes(block)) text = text.replaceAll(block, replacement);
    fs.writeFileSync(emailAuth, text);
  }
}

// The 2FA completion endpoint also issues a JWT; it must create the same server session.
if (fs.existsSync(securityAuth)) {
  let text = fs.readFileSync(securityAuth, 'utf8');
  if (!text.includes('/* session-security-2fa-v1 */')) {
    const block = `    const token=app.jwt.sign({id:user.id,username:user.username});`;
    const replacement = `${block}\n    /* session-security-2fa-v1 */\n    await prisma.userSession.create({data:{userId:user.id,tokenHash:crypto.createHash('sha256').update(token).digest('hex'),deviceName:String(request.headers?.['x-device-name']??'Web'),platform:String(request.headers?.['x-platform']??'web'),userAgent:String(request.headers?.['user-agent']??'').slice(0,1000),ipAddress:String(request.ip??'').slice(0,128),expiresAt:new Date(Date.now()+30*24*60*60*1000)}});`;
    if (text.includes(block)) text = text.replace(block, replacement);
    fs.writeFileSync(securityAuth, text);
  }
}

console.log('[Production] session management routes and all auth token issuances are session-bound');
