import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mainFile = path.resolve(root, 'src/main.tsx');
if (!fs.existsSync(mainFile)) throw new Error('Mobile auth hardening: src/main.tsx not found');

// This patch used to rewrite the Auth component and several source modules during
// every production build. That made builds order-dependent and could generate invalid
// TypeScript after other patches had already changed the source. Authentication now
// gets its API URL from runtime-config and the checked-in source, so this build step
// intentionally performs no source mutation. Keeping the script in the pipeline makes
// older deployments/workflows compatible without allowing a build-time text patch to
// corrupt the application.
console.log('Mobile auth hardening: build-safe no-op; runtime API configuration is authoritative.');
