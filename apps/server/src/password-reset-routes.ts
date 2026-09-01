import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { createPasswordResetToken, consumePasswordResetToken } from './auth-reset';
import { sendPasswordResetEmail } from './email';

export async function registerPasswordResetRoutes(app: FastifyInstance) {
  app.post('/api/auth/forgot-password', async (request, reply) => {
    const body = request.body as { email?: string };
    const email = body?.email?.trim().toLowerCase();
    if (!email) return reply.code(400).send({ message: 'Email is required' });

    const user = await app.prisma.user.findUnique({ where: { email } });
    // Do not reveal whether an account exists.
    if (!user) return reply.send({ message: 'If an account exists for this email, a reset link has been sent.' });

    const { token, tokenHash, expiresAt } = createPasswordResetToken();
    await app.prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt } });

    const webUrl = (process.env.WEB_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
    const resetUrl = `${webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail(user.email!, user.displayName, resetUrl);
    } catch (error) {
      await app.prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: null, resetTokenExpiresAt: null } });
      app.log.error(error);
      return reply.code(503).send({ message: 'Password reset email could not be sent. Please try again later.' });
    }
    return reply.send({ message: 'If an account exists for this email, a reset link has been sent.' });
  });

  app.post('/api/auth/reset-password', async (request, reply) => {
    const body = request.body as { token?: string; password?: string };
    const token = body?.token?.trim();
    const password = body?.password || '';
    if (!token || password.length < 8) return reply.code(400).send({ message: 'A valid reset token and password of at least 8 characters are required.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const consumed = await consumePasswordResetToken(app.prisma, token, passwordHash);
    if (!consumed) return reply.code(400).send({ message: 'This reset link is invalid or expired. Please request a new one.' });
    return reply.send({ message: 'Password reset successfully. You can now log in.' });
  });
}
