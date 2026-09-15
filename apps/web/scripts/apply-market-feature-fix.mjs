import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve(process.cwd(),'src/main.tsx');
if(!fs.existsSync(file))process.exit(0);
let s=fs.readFileSync(file,'utf8');
const before=s;
s=s.replace("'+c[3].startsWith('entity:')?'Create':'Open'+'</button>'","'+(c[3].startsWith('entity:')?'Create':'Open')+'</button>'");
if(s!==before)fs.writeFileSync(file,s);
