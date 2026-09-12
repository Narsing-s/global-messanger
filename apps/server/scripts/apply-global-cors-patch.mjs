import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'apps/server/src/index.ts');

if (!fs.existsSync(file)) {
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');

const start = source.indexOf('const isAllowedOrigin =');
const end = source.indexOf('\n};', start);

if (start === -1 || end === -1) {
  console.error('Global CORS patch: isAllowedOrigin was not found.');
  process.exit(1);
}

const replacement = `const isAllowedOrigin = (origin?: string | null) => {
  // Allow requests without an Origin header and native Capacitor/Ionic apps.
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
    /^ionic:\\/\\/localhost$/.test(origin);

  const isHelpCentre =
    origin === 'https://global-messenger-help-centre.onrender.com';

  return configured.includes(origin) || isLocalDev || isNativeApp || isHelpCentre;
};`;

source =
  source.slice(0, start) +
  replacement +
  source.slice(end + 3);

const corsStart = source.indexOf('await app.register(cors, {');
const corsEnd = source.indexOf('\n});', corsStart);

if (corsStart === -1 || corsEnd === -1) {
  console.error('Global CORS patch: Fastify CORS registration was not found.');
  process.exit(1);
}

const corsReplacement = `await app.register(cors, {
  origin: (origin, cb) => {
    cb(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  preflight: true,
  optionsSuccessStatus: 204,
  strictPreflight: false
});`;

source =
  source.slice(0, corsStart) +
  corsReplacement +
  source.slice(corsEnd + 4);

fs.writeFileSync(file, source);

console.log('Global CORS patch applied successfully.');
