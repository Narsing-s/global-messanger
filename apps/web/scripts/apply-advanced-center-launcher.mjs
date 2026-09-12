import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve(process.cwd(),'index.html');
if(!fs.existsSync(file))process.exit(0);
let text=fs.readFileSync(file,'utf8');
const script='<script src="/advanced-feature-launcher.js?v=advanced-feature-center-v2-20260912"></script>';
if(!text.includes(script)){text=text.replace('<script src="/advanced-feature-center-lite.js?v=advanced-feature-center-v2-20260912"></script>', '<script src="/advanced-feature-center-lite.js?v=advanced-feature-center-v2-20260912"></script>\n    '+script);fs.writeFileSync(file,text);}
