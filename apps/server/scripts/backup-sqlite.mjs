import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const databaseUrl = String(process.env.DATABASE_URL ?? '');
if (!databaseUrl.startsWith('file:')) throw new Error('DATABASE_URL must be a SQLite file: URL');

const source = databaseUrl.slice(5).split('?')[0];
const backupDir = process.env.BACKUP_DIR ?? './backups';
await fs.mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.resolve(backupDir, `global-messenger-${stamp}.db`);

const prisma = new PrismaClient();
try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  console.log(`SQLite backup created: ${target}`);
} finally {
  await prisma.$disconnect();
}
