import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/styles.css');
if (!fs.existsSync(file)) process.exit(0);
let css = fs.readFileSync(file, 'utf8');
const marker = '/* global-messenger-workspace-v1 */';
if (!css.includes(marker)) {
  css += `\n${marker}\n.workspace-tools{display:flex;align-items:center;gap:6px}\n.workspace-tools .icon-button{display:inline-flex;align-items:center;justify-content:center}\n.auth-service-note{display:block;margin-top:14px;text-align:center;opacity:.65;font-size:12px}\n@media(max-width:760px){.workspace-tools{gap:2px}.workspace-tools .icon-button{width:38px;height:38px}}\n`;
  fs.writeFileSync(file, css);
}
