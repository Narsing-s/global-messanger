import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args) {
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\n=== Global Messenger local verification ===\n');
run(['run', 'doctor']);
console.log('=== Building web + server ===\n');
run(['run', 'build']);
console.log('\nLocal verification passed. Start the app with: npm run dev');
console.log('Then run: npm run smoke');
