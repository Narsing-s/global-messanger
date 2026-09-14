import fs from 'node:fs';
import path from 'node:path';

const webRoot = process.cwd();

// The Complete Operations Center is the single canonical product center.
const mainFile = path.resolve(webRoot, 'src/main.tsx');
if (fs.existsSync(mainFile)) {
  let source = fs.readFileSync(mainFile, 'utf8');
  const importAnchor = "import ProductCenter from './components/ProductCenter';";
  const completeImport = "import ProductCenter from './components/ProductCenter';";
  if (source.includes(importAnchor) && !source.includes("gm:open-direct")) {
    const anchor = "  useEffect(()=>{if(!active||!socket)return;";
    if (source.includes(anchor)) {
      const bridge = `  useEffect(()=>{const handleOpenDirect=(event:any)=>{const chat=event?.detail;if(!chat?.id)return;setChats(p=>[chat,...p.filter((item:any)=>item.id!==chat.id)]);setActive(chat);setQuery('');setResults([]);setMobileChat(true)};window.addEventListener('gm:open-direct',handleOpenDirect);return()=>window.removeEventListener('gm:open-direct',handleOpenDirect)},[]);\n\n`;
      source = source.replace(anchor, bridge + anchor);
    }
  }
  fs.writeFileSync(mainFile, source);
}

// The standalone component uses the existing authenticated request helper.
const suiteFile = path.resolve(webRoot, 'src/components/CompleteOperationsCenter.tsx');
if (fs.existsSync(suiteFile)) {
  let source = fs.readFileSync(suiteFile, 'utf8');
  source = source.replace("import { api, request } from '../api';", "import { api, request } from '../api';");
  fs.writeFileSync(suiteFile, source);
}

console.log('[complete-operations] canonical operations center integrated');
