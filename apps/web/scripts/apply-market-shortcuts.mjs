import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve(process.cwd(),'src/main.tsx');
if(!fs.existsSync(file))process.exit(0);
let s=fs.readFileSync(file,'utf8');
if(s.includes('gm-market-shortcuts-v1'))process.exit(0);
const patch=`
// gm-market-shortcuts-v1
function installMarketShortcuts(){
  if((window as any).__gmShortcuts)return;(window as any).__gmShortcuts=true;
  window.addEventListener('keydown',(e)=>{
    const key=e.key.toLowerCase();
    if(e.key==='Escape'){document.querySelector<HTMLElement>('.gm-feature-modal.open')?.classList.remove('open');document.querySelector<HTMLElement>('.message-menu')?.remove();return;}
    if((e.ctrlKey||e.metaKey)&&key==='k'){e.preventDefault();document.querySelector<HTMLInputElement>('.search-box input')?.focus();return;}
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&key==='n'){e.preventDefault();document.querySelector<HTMLInputElement>('.search-box input')?.focus();return;}
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&key==='a'){e.preventDefault();window.dispatchEvent(new CustomEvent('gm:feature-center'));setTimeout(()=>document.querySelector<HTMLElement>('.gm-feature-nav button[data-section="smart"]')?.click(),30);}
  });
}
`;
const marker='function App(){';const i=s.indexOf(marker);if(i<0)throw new Error('App marker not found');s=s.slice(0,i)+patch+'\n'+s.slice(i);s=s.replace('function App(){','function App(){installMarketShortcuts();');fs.writeFileSync(file,s);
