import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes("ProductCenter from './components/ProductCenter'")) {
  source = source.replace("import { installEnhancements } from './enhancements';", "import { installEnhancements } from './enhancements';\nimport ProductCenter from './components/ProductCenter';");
}

if (!source.includes('productOpen')) {
  source = source.replace("const [groupOpen,setGroupOpen]=useState(false),[groupTitle", "const [productOpen,setProductOpen]=useState(false),[groupOpen,setGroupOpen]=useState(false),[groupTitle");
}

const header = '<header className="pane-header"><div><h1>Global <span>Messenger</span></h1><p>Connect · Chat · Share · Across the World</p></div><div className="workspace-tools"><button className="icon-button" title="Product Center" onClick={()=>setProductOpen(true)}><Sparkles/></button><button className="icon-button" title="Messenger Tools" onClick={()=>window.dispatchEvent(new CustomEvent(\'gm:options\'))}><Menu/></button></div></header>';
const headers = [
  '<header className="pane-header"><div><h1>Global <span>Messenger</span></h1><p>Connect · Chat · Share · Across the World</p></div><button className="icon-button"><MoreVertical/></button></header>',
  '<header className="pane-header"><div><h1>Global <span>Messenger</span></h1><p>Connect · Chat · Share · Across the World</p></div><div className="workspace-tools"><button type="button" className="workspace-tool product-tool" onClick={()=>window.__gmProductCenter?.open?.()||window.__gmAdvancedCompletion?.open?.()}>⌘ <span>Product Center</span></button><button type="button" className="workspace-tool messenger-tool" onClick={()=>window.dispatchEvent(new CustomEvent(\'gm:options\'))}>☰ <span>Messenger Tools</span></button><button className="icon-button" title="More"><MoreVertical/></button></div></header>'
];
for (const value of headers) source = source.replace(value, header);

if (!source.includes('<ProductCenter onClose')) {
  source = source.replace('{groupOpen&&<GroupModal title={groupTitle}', '{productOpen&&<ProductCenter onClose={()=>setProductOpen(false)} user={user} chats={chats} activeChat={active}/>} {groupOpen&&<GroupModal title={groupTitle}');
}

// Login screen should have one brand mark, not two identical globe symbols.
source = source.replace('<div className="auth-icon"><Globe2/></div>', '');

fs.writeFileSync(file, source);
console.log('[Production] chat workspace tools activated');
