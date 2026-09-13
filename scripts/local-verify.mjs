import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args) {
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`Command failed: npm ${args.join(' ')}`);
  }
}

console.log('\n=== Global Messenger local verification ===\n');
run(['run', 'doctor']);

// Node 24 currently has a Windows/libuv shutdown regression that can abort
// successful Vite-family builds during process teardown. Keep development
// available on newer Node versions, but do not report a misleading build failure.
if (process.platform === 'win32' && Number(process.versions.node.split('.')[0]) >= 24) {
  console.error(
    '\nLocal verification stopped before the build: Node.js 24+ on Windows can abort Vite builds during process teardown with the libuv UV_HANDLE_CLOSING assertion.\n' +
      'Use Node.js 22 LTS for the local verification gate, then run `npm ci` and `npm run verify:local` again.\n'
  );
  process.exitCode = 1;
  process.exit();
}

console.log('=== Building web + server ===\n');
run(['run', 'build']);
console.log('\nLocal verification passed. Start the app with: npm run dev');
console.log('Then run: npm run smoke');
