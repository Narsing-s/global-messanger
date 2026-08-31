import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;

function start(name, args, cwd) {
  const child = spawn(npm, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    env: process.env,
    // Windows can throw EINVAL when npm.cmd is spawned without a shell.
    shell: process.platform === 'win32'
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (signal) {
      shutdown(0);
      return;
    }
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code ?? 'unknown'}`);
      shutdown(code || 1);
    }
  });

  child.on('error', err => {
    if (stopping) return;
    console.error(`[${name}] failed to start: ${err.message}`);
    shutdown(1);
  });
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (!child.killed) child.kill();
    } catch {}
  }
  setTimeout(() => process.exit(code), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`[dev] root: ${root}`);
console.log('[dev] starting Global Messenger server and web app...');
start('SERVER', ['run', 'dev'], 'apps/server');
start('WEB', ['run', 'dev', '--', '--host', '127.0.0.1', '--strictPort'], 'apps/web');
