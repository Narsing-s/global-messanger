import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/+/, ''));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];

function start(name, args, cwd) {
  const child = spawn(npm, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    } else if (signal) {
      shutdown(0);
    }
  });
  child.on('error', err => {
    console.error(`[${name}] failed to start: ${err.message}`);
    shutdown(1);
  });
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev] starting Global Messenger server and web app...');
start('SERVER', ['run', 'dev'], 'apps/server');
start('WEB', ['run', 'dev', '--', '--host', '127.0.0.1', '--strictPort'], 'apps/web');
