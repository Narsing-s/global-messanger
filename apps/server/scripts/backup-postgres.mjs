import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const dir = path.resolve(process.env.BACKUP_DIR ?? './backups');
await fs.mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(dir, `global-messenger-${stamp}.dump`);
await new Promise((resolve, reject) => {
  const child = spawn(process.env.PG_DUMP_PATH ?? 'pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', file, databaseUrl], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)));
});
if (process.env.BACKUP_BUCKET_COMMAND) {
  const [command, ...args] = process.env.BACKUP_BUCKET_COMMAND.split(' ');
  await new Promise((resolve, reject) => { const child = spawn(command, [...args, file], { stdio: 'inherit', shell: false }); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`backup upload exited ${code}`))); });
}
console.log(JSON.stringify({ ok: true, file, pitr: Boolean(process.env.PG_WAL_ARCHIVE_BUCKET), retentionDays: Number(process.env.BACKUP_RETENTION_DAYS ?? 30) }));
