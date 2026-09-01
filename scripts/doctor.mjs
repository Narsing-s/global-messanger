import process from 'node:process';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const failures = [];
const warnings = [];

function command(name, args) {
  try {
    return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function versionMajor(value) {
  const match = String(value || '').match(/v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

const nodeVersion = process.version;
if (versionMajor(nodeVersion) < 22) {
  failures.push(`Node.js 22+ is required (found ${nodeVersion}).`);
}

const npmVersion = command(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']);
if (!npmVersion) failures.push('npm is not available on PATH.');

if (!fs.existsSync('package-lock.json')) failures.push('package-lock.json is missing; run npm install once.');
if (!fs.existsSync('apps/server/prisma/schema.prisma')) failures.push('Prisma schema is missing.');
if (!fs.existsSync('apps/web/src/main.tsx')) failures.push('Web application entrypoint is missing.');

const dockerVersion = command('docker', ['--version']);
if (!dockerVersion) warnings.push('Docker is not installed/on PATH. PostgreSQL local development will need another database.');

const gitVersion = command('git', ['--version']);
if (!gitVersion) warnings.push('Git is not available on PATH.');

if (failures.length) {
  console.error('\nGlobal Messenger local doctor: FAILED');
  for (const failure of failures) console.error(`  ✖ ${failure}`);
  process.exit(1);
}

console.log('\nGlobal Messenger local doctor: OK');
console.log(`  ✓ Node ${nodeVersion}`);
console.log(`  ✓ npm ${npmVersion}`);
console.log('  ✓ workspace, Prisma schema and web entrypoint found');
if (dockerVersion) console.log(`  ✓ ${dockerVersion}`);
if (gitVersion) console.log(`  ✓ ${gitVersion}`);
for (const warning of warnings) console.warn(`  ! ${warning}`);
console.log('');
