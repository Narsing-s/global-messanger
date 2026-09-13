import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const api = (process.env.LOCAL_API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const web = (process.env.LOCAL_WEB_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const timeoutMs = Number(process.env.LOCAL_E2E_TIMEOUT_MS || 5000);

async function check(name, url, expectedStatus = 200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    if (response.status !== expectedStatus) {
      throw new Error(`${name}: HTTP ${response.status} from ${url}\n${body.slice(0, 300)}`);
    }
    console.log(`✓ ${name}: HTTP ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function run(args) {
  const result = spawnSync(npm, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\n=== Global Messenger local end-to-end gate ===\n');
console.log(`API: ${api}`);
console.log(`Web: ${web}\n`);

try {
  await check('API health', `${api}/health`);
  await check('API readiness', `${api}/ready`);
  await check('Web app', `${web}/`);
} catch (error) {
  console.error(`\n✖ Local services are not ready: ${error instanceof Error ? error.message : String(error)}`);
  console.error('\nStart the local stack first: npm run dev');
  process.exit(1);
}

console.log('\n=== Running two-user realtime E2E ===\n');
run(['run', 'e2e:release', '-w', 'apps/web']);

console.log('\n=== Local end-to-end gate PASSED ===');
console.log('API health/readiness, web startup, authentication, user search, direct chat, Socket.IO realtime delivery, reconnect, message operations and group creation passed.');
console.log('Android release work is intentionally not part of this gate.');
