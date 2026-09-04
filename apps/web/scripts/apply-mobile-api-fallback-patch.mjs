import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/features.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
const oldValue = "const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';";
const newValue = "const API = (window as any).__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? window.location.origin : 'https://global-messanger-backend.onrender.com');";

if (source.includes(oldValue)) {
  source = source.replace(oldValue, newValue);
  fs.writeFileSync(file, source);
}
