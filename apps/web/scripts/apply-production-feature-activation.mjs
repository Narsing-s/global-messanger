import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes("import './features';")) {
  source = source.replace(
    "import { initPushNotifications } from './push';",
    "import { initPushNotifications } from './push';\nimport './features';\nimport './advanced-ui';\nimport './workspace-tools';"
  );
} else if (!source.includes("import './workspace-tools';")) {
  source = source.replace("import './advanced-ui';", "import './advanced-ui';\nimport './workspace-tools';");
}

if (!source.includes('__gmConversations')) {
  source = source.replace(
    "api.conversations().then(data=>setChats(Array.isArray(data)?data:[])).catch(e=>setSocketError(e.message||'Unable to load conversations'));",
    "api.conversations().then(data=>{const list=Array.isArray(data)?data:[];setChats(list);(window as any).__gmConversations=list}).catch(e=>setSocketError(e.message||'Unable to load conversations'));"
  );
}

source = source.replace(
  '<button title="Contacts"><UserPlus/><span>Contacts</span></button>',
  '<button title="Contacts" onClick={()=>window.dispatchEvent(new CustomEvent(\'gm:options\'))}><UserPlus/><span>Contacts</span></button>'
);
source = source.replace(
  '<button title="Notifications"><Bell/></button>',
  '<button title="Notifications" onClick={()=>window.dispatchEvent(new CustomEvent(\'gm:notifications\'))}><Bell/></button>'
);

// Keep the login screen branded exactly once: the horizontal brand is the single source of truth.
source = source.replace('<div className="auth-icon"><Globe2/></div>', '');

// Self-hosted browser auth is same-origin only. Native Capacitor builds may use their
// explicitly configured API origin, but a browser must never fall back to retired
// Cloudflare/Render endpoints or persist a remote API override.
const oldSubmit = "async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);try{const url=API+(register?'/api/auth/register-email':'/api/auth/login-email');const body=register?{username,displayName:displayName||username,email,password}:{identifier:username,password};const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.message||'Authentication failed');if(register&&password!==confirm)throw Error('Passwords do not match');localStorage.setItem('gm_token',d.token);localStorage.setItem('gm_user',JSON.stringify(d.user));location.href='/'}catch(e:any){setError(e.message||'Authentication failed')}finally{setLoading(false)}}";
const newSubmit = "async function submit(e:React.FormEvent){e.preventDefault();setError('');if(register&&password!==confirm){setError('Passwords do not match');return}setLoading(true);const browserOrigin=window.location.origin;const native=['capacitor:','ionic:','file:','null'].includes(window.location.protocol);const base=native?API.replace(/\\/$/,''):browserOrigin;try{const paths=register?['/api/auth/register-email','/api/auth/register']:['/api/auth/login-email','/api/auth/login'];let lastError='Authentication failed';for(const path of paths){try{const body=register?{username,displayName:displayName||username,email,password}:{identifier:username,password};const legacy={username,password};const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(path.endsWith('/login')?legacy:body),credentials:'include'});const text=await r.text();let d:any={};try{d=text?JSON.parse(text):{}}catch{d={message:text}}if(!r.ok){lastError=d?.message||`${r.status} ${r.statusText}`;continue}if(!d?.token||!d?.user){lastError='Login server did not return a login token';continue}localStorage.setItem('gm_token',String(d.token));localStorage.setItem('gm_user',JSON.stringify(d.user));if(native)localStorage.setItem('gm_api_url',base);else localStorage.removeItem('gm_api_url');location.href='/';return}catch(err:any){lastError=err?.message||lastError}}throw new Error(`Unable to sign in from this device. ${lastError}`)}catch(e:any){setError(e.message||'Authentication failed')}finally{setLoading(false)}}";
if (source.includes(oldSubmit)) source = source.replace(oldSubmit, newSubmit);

const oldHeader = '<header className="pane-header"><div><h1>Global <span>Messenger</span></h1><p>Connect · Chat · Share · Across the World</p></div><button className="icon-button"><MoreVertical/></button></header>';
const newHeader = '<header className="pane-header"><div><h1>Global <span>Messenger</span></h1><p>Connect · Chat · Share · Across the World</p></div><div className="workspace-tools"><button type="button" className="workspace-tool product-tool" onClick={()=>window.__gmProductCenter?.open?.()||window.__gmAdvancedCompletion?.open?.()}>⌘ <span>Product Center</span></button><button type="button" className="workspace-tool messenger-tool" onClick={()=>window.dispatchEvent(new CustomEvent(\'gm:options\'))}>☰ <span>Messenger Tools</span></button><button className="icon-button" title="More"><MoreVertical/></button></div></header>';
source = source.replace(oldHeader, newHeader);

fs.writeFileSync(file, source);
console.log('[Production] messenger capabilities activated + self-hosted same-origin auth');
