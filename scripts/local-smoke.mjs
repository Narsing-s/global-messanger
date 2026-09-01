const checks = [
  ['API health', process.env.API_URL || 'http://127.0.0.1:4000/health'],
  ['Web app', process.env.WEB_URL || 'http://127.0.0.1:5173/'],
];

let failed = false;

for (const [name, url] of checks) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      failed = true;
      console.error(`✖ ${name}: HTTP ${response.status} (${url})`);
      continue;
    }
    console.log(`✓ ${name}: HTTP ${response.status}`);
  } catch (error) {
    failed = true;
    console.error(`✖ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  console.error('\nLocal smoke test failed. Start the app with: npm run dev');
  process.exit(1);
}

console.log('\nLocal smoke test passed.');
