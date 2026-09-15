import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexFile = path.join(serverRoot, 'src/index.ts');
const advancedFile = path.join(serverRoot, 'src/advanced.ts');

const sessionCreate = `
      const rawAuthorization = String(request.headers?.authorization || '');
      const bearerToken = rawAuthorization.startsWith('Bearer ') ? rawAuthorization.slice(7) : '';
      if (bearerToken && request.user?.id) {
        const tokenHash = crypto.createHash('sha256').update(bearerToken).digest('hex');
        const session = await prisma.userSession.findFirst({
          where: { tokenHash, userId: request.user.id, revokedAt: null }
        });
        if (!session || session.expiresAt <= new Date()) {
          throw app.httpErrors.unauthorized('Session expired or revoked');
        }
        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() }
        });
      }
`;

let source = fs.readFileSync(indexFile, 'utf8');

// This patch used to depend on one exact formatting of the authenticate handler.
// Other production patches legitimately change that handler, so locate it
// structurally and inject the session guard immediately after jwt verification.
if (!source.includes('/* session-security-v1 */')) {
  const authAnchor = "app.decorate(\n  'authenticate',";
  const authStart = source.indexOf(authAnchor);
  if (authStart === -1) throw new Error('Session patch: authenticate declaration not found');

  const jwtPos = source.indexOf('await request.jwtVerify();', authStart);
  if (jwtPos === -1) throw new Error('Session patch: jwtVerify call not found inside authenticate');

  const lineEnd = source.indexOf('\n', jwtPos);
  if (lineEnd === -1) throw new Error('Session patch: malformed authenticate handler');

  source = source.slice(0, lineEnd + 1)
    + `    /* session-security-v1 */\n    {\n${sessionCreate}    }\n`
    + source.slice(lineEnd + 1);

  if (!source.includes("import crypto from 'node:crypto';")) {
    const importAnchor = "import fs from 'node:fs';";
    source = source.replace(importAnchor, `${importAnchor}\nimport crypto from 'node:crypto';`);
  }
}

fs.writeFileSync(indexFile, source);

let advanced = fs.readFileSync(advancedFile, 'utf8');
if (!advanced.includes("from './session-security.js'")) {
  const marker = "import { prisma } from './db.js';";
  if (advanced.includes(marker)) {
    advanced = advanced.replace(marker, `${marker}\nimport { registerSessionSecurity } from './session-security.js';`);
  }
}
if (!advanced.includes('registerSessionSecurity(app);')) {
  const registerMarker = 'export async function registerAdvancedRoutes';
  const pos = advanced.indexOf(registerMarker);
  if (pos !== -1) {
    const bodyStart = advanced.indexOf('{', pos);
    if (bodyStart !== -1) advanced = advanced.slice(0, bodyStart + 1) + '\n  registerSessionSecurity(app);' + advanced.slice(bodyStart + 1);
  }
}
fs.writeFileSync(advancedFile, advanced);

console.log('Session security patch applied');
