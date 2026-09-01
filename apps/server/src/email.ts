import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, displayName: string, resetUrl: string) {
  if (!resend || !process.env.EMAIL_FROM) {
    throw new Error('Password reset email is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
  }
  const safeName = displayName || 'there';
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset your Global Messenger password',
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7fb;padding:32px"><div style="max-width:560px;margin:auto;background:white;padding:32px;border-radius:16px"><h1>Global Messenger</h1><h2>Reset your password</h2><p>Hello ${safeName},</p><p>We received a request to reset your Global Messenger password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset Password</a></p><p>If you did not request this, you can safely ignore this email.</p></div></body></html>`
  });
  if (error) throw new Error(error.message || 'Unable to send password reset email');
}
