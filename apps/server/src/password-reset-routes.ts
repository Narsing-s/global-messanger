import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { createPasswordResetToken, consumePasswordResetToken } from './auth-reset';
import { sendPasswordResetEmail } from './smtp.js';

const PRODUCTION_WEB_URL = 'https://global-messenger-web.onrender.com';
const LOCAL_WEB_URL = 'http://127.0.0.1:5180';

export async function registerPasswordResetRoutes(app: FastifyInstance) {
  app.post('/api/auth/forgot-password', async (request, reply) => {
    const body = request.body as { email?: string };
    const email = body?.email?.trim().toLowerCase();
    if (!email) return reply.code(400).send({ message: 'Email is required' });

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) return reply.send({ message: 'If an account exists for that email, a password reset link has been sent.' });

    const { token, tokenHash, expiresAt } = createPasswordResetToken();
    await app.prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt } });

    const configuredWebUrl = process.env.PASSWORD_RESET_WEB_ORIGIN?.trim().replace(/\/$/, '');
    let webUrl = configuredWebUrl || (process.env.NODE_ENV === 'production' ? PRODUCTION_WEB_URL : LOCAL_WEB_URL);

    // Never send a reset link to another local application (for example NEXORA on :5173).
    // Global Messenger's Vite server is intentionally on :5180.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(webUrl)) {
      webUrl = LOCAL_WEB_URL;
    }

    const resetUrl = `${webUrl}/reset-password.html?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail(user.email!, user.displayName, resetUrl);
    } catch (error: any) {
      await app.prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: null, resetTokenExpiresAt: null } });
      app.log.error({ err: error }, 'Password reset email failed');
      return reply.code(503).send({ message: error?.message || 'Password reset email could not be sent.' });
    }

    return reply.send({ message: `Password reset link sent successfully to ${user.email}. Please check your inbox and spam folder.` });
  });

  app.post('/api/auth/reset-password', async (request, reply) => {
    const body = request.body as { token?: string; password?: string };
    const token = body?.token?.trim();
    const password = body?.password || '';
    if (!token || password.length < 8) {
      return reply.code(400).send({ message: 'A valid reset token and password of at least 8 characters are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const consumed = await consumePasswordResetToken(app.prisma, token, passwordHash);
    if (!consumed) {
      return reply.code(400).send({ message: 'This reset link is invalid or expired. Please request a new one.' });
    }

    return reply.send({ message: 'Password reset successfully. You can now log in.' });
  });
}
