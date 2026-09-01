import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function consumePasswordResetToken(prisma: PrismaClient, token: string, passwordHash: string) {
  const tokenHash = hashPasswordResetToken(token);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
    select: { id: true }
  });
  if (!user) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null }
  });
  return true;
}
