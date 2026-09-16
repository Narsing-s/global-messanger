import fs from 'node:fs';

const file = 'src/enhancements.ts';
if (!fs.existsSync(file)) throw new Error('Visible account controls: src/enhancements.ts not found');
let source = fs.readFileSync(file, 'utf8');
const guard = '/* visible-account-controls-v1 */';
if (!source.includes(guard)) {
  const anchor = 'function installEnhancements(){';
  if (!source.includes(anchor)) throw new Error('Visible account controls: installEnhancements anchor not found');
  const injected = `
function ensureVisibleAccountControls(){
  if(document.getElementById('gm-visible-account-controls')) return;
  const user=JSON.parse(localStorage.getItem('gm_user')||'null');
  const token=localStorage.getItem('gm_token');
  if(!user||!token) return;
  const el=document.createElement('div');
  el.id='gm-visible-account-controls';
  el.innerHTML=
    '<div class="gm-account-copy"><strong></strong><span></span></div><button type="button" aria-label="Log out"><span>Log out</span></button>';
  el.querySelector('strong').textContent=String(user.displayName||user.username||'Account');
  el.querySelector('span').textContent='@'+String(user.username||'');
  const logout=el.querySelector('button');
  logout.onclick=async()=>{
    logout.disabled=true;
    try{await fetch(apiUrl('/api/auth/logout'),{method:'POST',headers:{Authorization:'Bearer '+token}})}catch{}
    localStorage.clear();
    location.reload();
  };
  document.body.appendChild(el);
}

`;
  source = source.replace(anchor, injected + anchor);
  const callAnchor = 'function installEnhancements(){';
  source = source.replace(callAnchor, callAnchor + `\n  ${guard}\n  ensureVisibleAccountControls();`);
  fs.writeFileSync(file, source);
}

const cssFile='src/enhancements.ts';
let s=fs.readFileSync(cssFile,'utf8');
const styleGuard='/* visible-account-controls-styles-v1 */';
if(!s.includes(styleGuard)){
  const styleAnchor="function styles(){";
  if(!s.includes(styleAnchor)) throw new Error('Visible account controls: styles anchor not found');
  const extra=`\n${styleGuard}\nfunction visibleAccountStyles(){if(document.getElementById('gm-visible-account-style'))return;const s=document.createElement('style');s.id='gm-visible-account-style';s.textContent=\\`#gm-visible-account-controls{position:fixed;left:16px;bottom:16px;z-index:99998;display:flex;align-items:center;gap:12px;min-width:220px;max-width:calc(100vw - 32px);padding:10px 12px;border:1px solid rgba(127,127,127,.24);border-radius:14px;background:var(--gm-panel,#fff);box-shadow:0 10px 35px rgba(0,0,0,.14);font-family:system-ui,sans-serif}#gm-visible-account-controls .gm-account-copy{display:flex;flex-direction:column;min-width:0;flex:1}#gm-visible-account-controls strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#gm-visible-account-controls .gm-account-copy span{font-size:11px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#gm-visible-account-controls button{border:0;border-radius:9px;padding:8px 10px;background:#182033;color:#fff;font-size:12px;font-weight:700;cursor:pointer}#gm-visible-account-controls button:disabled{opacity:.6;cursor:wait}@media(max-width:600px){#gm-visible-account-controls{left:10px;right:10px;bottom:10px;min-width:0}}\\`;document.head.appendChild(s)}\n\n`;
  s=s.replace(styleAnchor,extra+styleAnchor);
  s=s.replace('function installEnhancements(){','function installEnhancements(){\n  visibleAccountStyles();');
  fs.writeFileSync(cssFile,s);
}
console.log('[UI] persistent username and visible Log out control enabled');
