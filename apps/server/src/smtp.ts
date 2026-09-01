import net from 'node:net';
import tls from 'node:tls';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

const required = (name: string, value: string | undefined) => {
  if (!value?.trim()) throw new Error(`Missing SMTP configuration: ${name}`);
  return value.trim();
};

const readResponse = (socket: net.Socket | tls.TLSSocket) =>
  new Promise<{ code: number; text: string }>((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      const complete = lines.filter(Boolean);
      if (!complete.length) return;
      const last = complete[complete.length - 1];
      const match = /^(\d{3})([ -])/.exec(last);
      if (!match) return;
      if (match[2] === '-') return;
      cleanup();
      resolve({ code: Number(match[1]), text: complete.join('\n') });
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const onClose = () => { cleanup(); reject(new Error('SMTP connection closed unexpectedly')); };
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };
    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });

const sendCommand = async (socket: net.Socket | tls.TLSSocket, command: string, expected: number[]) => {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  if (!expected.includes(response.code)) throw new Error(`SMTP ${response.code}: ${response.text}`);
  return response;
};

const escapeHeader = (value: string) => value.replace(/[\r\n]/g, ' ').trim();
const htmlEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

const sendMail = async (config: SmtpConfig, to: string, subject: string, html: string) => {
  let socket: net.Socket | tls.TLSSocket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.createConnection({ host: config.host, port: config.port });

  try {
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => { cleanup(); resolve(); };
      const onError = (error: Error) => { cleanup(); reject(error); };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('secureConnect', onConnect);
        socket.off('error', onError);
      };
      if (config.secure) socket.once('secureConnect', onConnect);
      else socket.once('connect', onConnect);
      socket.once('error', onError);
    });

    const greeting = await readResponse(socket);
    if (greeting.code !== 220) throw new Error(`SMTP ${greeting.code}: ${greeting.text}`);
    await sendCommand(socket, 'EHLO global-messenger.local', [250]);

    if (!config.secure && config.port !== 25) {
      await sendCommand(socket, 'STARTTLS', [220]);
      const plainSocket = socket;
      socket = tls.connect({ socket: plainSocket, servername: config.host });
      await new Promise<void>((resolve, reject) => {
        socket.once('secureConnect', resolve);
        socket.once('error', reject);
      });
      await sendCommand(socket, 'EHLO global-messenger.local', [250]);
    }

    if (config.user || config.password) {
      const user = required('SMTP_USER', config.user);
      const password = required('SMTP_PASSWORD', config.password);
      await sendCommand(socket, 'AUTH LOGIN', [334]);
      await sendCommand(socket, Buffer.from(user).toString('base64'), [334]);
      await sendCommand(socket, Buffer.from(password).toString('base64'), [235]);
    }

    await sendCommand(socket, `MAIL FROM:<${escapeHeader(config.from)}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${escapeHeader(to)}>`, [250, 251]);
    await sendCommand(socket, 'DATA', [354]);

    const body = [
      `From: ${escapeHeader(config.from)}`,
      `To: ${escapeHeader(to)}`,
      `Subject: ${escapeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html
    ].join('\r\n').replace(/^\./gm, '..');

    socket.write(`${body}\r\n.\r\n`);
    const delivered = await readResponse(socket);
    if (delivered.code !== 250) throw new Error(`SMTP ${delivered.code}: ${delivered.text}`);
    socket.write('QUIT\r\n');
    await readResponse(socket).catch(() => undefined);
  } finally {
    socket.destroy();
  }
};

export async function sendPasswordResetEmail(to: string, displayName: string, resetUrl: string) {
  const host = required('SMTP_HOST', process.env.SMTP_HOST);
  const from = required('MAIL_FROM', process.env.MAIL_FROM);
  const port = Number(process.env.SMTP_PORT ?? (process.env.SMTP_SECURE === 'true' ? 465 : 587));
  const secure = String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT must be a valid TCP port');

  // Keep the reset destination generated by the server. In local development
  // this is the Global Messenger API on port 4000, which cannot be confused
  // with another SPA running on the frontend port.
  const normalizedResetUrl = resetUrl.replace(/\/reset-password(?:\.html)?(?:\/)?(?=\?)/, '/reset-password/');

  const safeName = htmlEscape(displayName || 'there');
  const safeUrl = htmlEscape(normalizedResetUrl);
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;background:#f6f7fb;padding:32px"><div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:16px"><h2>Reset your Global Messenger password</h2><p>Hello ${safeName},</p><p>We received a request to reset your Global Messenger password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px">Reset password</a></p><p>This link expires in 30 minutes and can only be used once.</p><p>If you did not request this, you can safely ignore this email.</p><p style="font-size:12px;color:#6b7280">Global Messenger</p></div></body></html>`;

  await sendMail({ host, port, secure, user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from }, to, 'Reset your Global Messenger password', html);
}
