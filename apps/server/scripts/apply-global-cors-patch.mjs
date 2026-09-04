import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.resolve(root, 'apps/server/src/index.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

const oldBlock = `const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) return true;

  const configured = WEB_ORIGIN
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const isLocalDev =
    /^https?:\\/\\/localhost:\\d+$/.test(origin) ||
    /^https?:\\/\\/127\\.0\\.0\\.1:\\d+$/.test(origin);

  return configured.includes(origin) || isLocalDev;
};`;

const newBlock = `const isAllowedOrigin = (origin?: string | null) => {
  // Native Android/WebView clients may use a non-http browser origin.
  // JWT authentication is sent explicitly in Authorization headers, so
  // allowing these app origins does not grant cookie-based authentication.
  if (!origin || origin === 'null') return true;

  const configured = WEB_ORIGIN
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const isLocalDev =
    /^https?:\\/\\/localhost(?::\\d+)?$/.test(origin) ||
    /^https?:\\/\\/127\\.0\\.0\\.1(?::\\d+)?$/.test(origin);

  const isNativeApp =
    /^capacitor:\\/\\/localhost$/.test(origin) ||
    /^ionic:\\/\\/localhost$/.test(origin) ||
    /^https?:\\/\\/localhost(?::\\d+)?$/.test(origin);

  return configured.includes(origin) || isLocalDev || isNativeApp;
};`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
} else if (!source.includes("const isNativeApp =")) {
  console.warn('Global CORS patch: expected isAllowedOrigin block was not found; leaving source unchanged.');
}

fs.writeFileSync(file, source);
