import 'dotenv/config';

if (process.env.NODE_ENV !== 'production') {
  console.log('Production config validation skipped (NODE_ENV is not production).');
  process.exit(0);
}

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'WEB_ORIGIN',
  'PASSWORD_RESET_WEB_ORIGIN'
];

const missing = required.filter(name => !String(process.env[name] ?? '').trim());

if (missing.length) {
  console.error(`Production configuration is incomplete. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET === 'development-only-secret') {
  console.error('JWT_SECRET must not use the development fallback in production.');
  process.exit(1);
}

const origins = process.env.WEB_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);
const invalidOrigins = origins.filter(origin => !/^https:\/\//.test(origin));
if (invalidOrigins.length) {
  console.error(`WEB_ORIGIN contains non-HTTPS production origins: ${invalidOrigins.join(', ')}`);
  process.exit(1);
}

const optional = {
  SMTP_PASSWORD: 'password-reset email delivery',
  STORAGE_BUCKET: 'durable media storage',
  TURN_URLS: 'WebRTC relay/TURN support'
};

const firebaseNames = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];
const configuredFirebase = firebaseNames.filter(name => String(process.env[name] ?? '').trim());
if (configuredFirebase.length > 0 && configuredFirebase.length !== firebaseNames.length) {
  const missingFirebase = firebaseNames.filter(name => !String(process.env[name] ?? '').trim());
  console.error(`FCM configuration is incomplete. Missing: ${missingFirebase.join(', ')}`);
  process.exit(1);
}

const missingOptional = Object.entries(optional)
  .filter(([name]) => !String(process.env[name] ?? '').trim())
  .map(([name, purpose]) => `${name} (${purpose})`);

console.log('Production configuration validation passed.');
if (missingOptional.length) {
  console.warn(`Optional production integrations not configured: ${missingOptional.join('; ')}`);
}
if (configuredFirebase.length === firebaseNames.length) {
  console.log('FCM production configuration detected.');
}
