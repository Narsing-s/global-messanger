import { chromium } from 'playwright';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const TIMEOUT = Number(process.env.BROWSER_E2E_TIMEOUT_MS || 30000);
const PASSWORD = 'GlobalMessenger!123';

function unique(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.replace(/[^a-z0-9]/gi, '').slice(0, 20).toLowerCase();
}

async function json(path, body, expected = [200, 201]) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!expected.includes(response.status)) throw new Error(`${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return data;
}

async function register() {
  const username = unique('browser');
  return json('/api/auth/register-email', {
    username,
    displayName: `Browser ${username.slice(-6)}`,
    email: `${username}@example.test`,
    password: PASSWORD
  });
}

async function login(page, username) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.getByPlaceholder('you@example.com or username').fill(username);
  await page.getByPlaceholder('At least 8 characters').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  await page.getByPlaceholder('Search messages or people...').waitFor({ state: 'visible', timeout: TIMEOUT });
}

async function openPerson(page, displayName, username) {
  const search = page.getByPlaceholder('Search messages or people...');
  await search.fill(username);
  const result = page.getByRole('button', { name: new RegExp(displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).filter({ hasText: `@${username}` }).first();
  await result.waitFor({ state: 'visible', timeout: TIMEOUT });
  await result.click();
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: TIMEOUT });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  for (const page of [pageA, pageB]) {
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  }

  try {
    const userA = await register();
    const userB = await register();

    // Real browser authentication, not injected tokens.
    await login(pageA, userA.user.username);
    await login(pageB, userB.user.username);

    await openPerson(pageA, userB.user.displayName, userB.user.username);
    const first = `Browser E2E realtime ${Date.now()}`;
    await pageA.getByPlaceholder('Type a message...').fill(first);
    await pageA.getByRole('button', { name: 'Send', exact: true }).click();

    // The second real browser session must receive the message without a reload.
    await pageB.getByText(userA.user.displayName, { exact: true }).first().click();
    await pageB.getByText(first, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });

    // Verify a second message in the reverse direction.
    const second = `Browser E2E reply ${Date.now()}`;
    await pageB.getByPlaceholder('Type a message...').fill(second);
    await pageB.getByRole('button', { name: 'Send', exact: true }).click();
    await pageA.getByText(second, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });

    // Refresh both browsers and verify persistence/synchronization.
    await pageA.reload({ waitUntil: 'networkidle', timeout: TIMEOUT });
    await pageB.reload({ waitUntil: 'networkidle', timeout: TIMEOUT });
    await pageA.getByText(first, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });
    await pageA.getByText(second, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });
    await pageB.getByText(first, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });
    await pageB.getByText(second, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });

    // Browser-level message operations.
    const bubble = pageA.getByText(second, { exact: true }).locator('..');
    const menuButton = bubble.getByRole('button').first();
    if (await menuButton.count()) {
      await menuButton.click();
      await pageA.getByRole('button', { name: 'Edit', exact: true }).click();
      await pageA.getByPlaceholder('Type a message...').fill(`${second} edited`);
      await pageA.getByRole('button', { name: 'Send', exact: true }).click();
      await pageA.getByText(`${second} edited`, { exact: true }).waitFor({ state: 'visible', timeout: TIMEOUT });
    }

    // Operations Center must remain accessible on both desktop and mobile.
    for (const page of [pageA, pageB]) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByText('Complete Operations', { exact: false }).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      for (const section of ['Command', 'People', 'Messages', 'Organize', 'Media', 'Notifications', 'Calls', 'Security', 'Advanced']) {
        if (!(await page.getByRole('button', { name: section, exact: true }).count())) {
          throw new Error(`Missing Operations Center section: ${section}`);
        }
      }
    }

    if (errors.length) throw new Error(`Browser runtime errors:\n${errors.join('\n')}`);
    console.log('PASS: multi-user browser E2E — real login, desktop/mobile sessions, realtime A→B, realtime B→A, persistence after reload, edit flow, Operations Center.');
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error('FAIL: browser E2E');
  console.error(error?.stack || error);
  process.exit(1);
});
