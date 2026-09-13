import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'public/global-product-center.js');
if (!fs.existsSync(file)) process.exit(0);
let text = fs.readFileSync(file, 'utf8');
// CSS/querySelector treats an id beginning with a digit as an invalid selector
// unless escaped. Use a semantic id instead so the 2FA control never crashes
// the Product Center render path.
text = text.replaceAll('id="2fa"', 'id="twofa"');
text = text.replaceAll("'#2fa'", "'#twofa'");
text = text.replaceAll('"#2fa"', '"#twofa"');
fs.writeFileSync(file, text);
