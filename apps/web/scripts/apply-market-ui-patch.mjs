import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
if (source.includes('gm-market-ui-v1')) process.exit(0);

const patch = `
// gm-market-ui-v1
function installMarketUI(){
  if(document.getElementById('gm-market-ui-v1')) return;
  const style=document.createElement('style');
  style.id='gm-market-ui-v1';
  style.textContent=\`
:root{--gm-bg:#07101f;--gm-bg2:#0d1830;--gm-blue:#3977ff;--gm-cyan:#20d8d0;--gm-violet:#7657ff;--gm-text:#eaf1ff;--gm-muted:#8d9ab5;--gm-line:rgba(255,255,255,.09);--gm-glass:rgba(12,23,45,.78)}
body{background:#07101f}
.app-shell{padding:0!important;gap:0!important;grid-template-columns:78px 330px minmax(440px,1fr) 300px!important;background:radial-gradient(circle at 50% -10%,rgba(57,119,255,.18),transparent 34%),linear-gradient(135deg,#050b17,#0a1428 52%,#07101f);color:var(--gm-text)}
.rail,.chat-pane,.message-pane,.info-pane{border:0!important;border-radius:0!important;box-shadow:none!important;background:var(--gm-glass)!important;backdrop-filter:blur(22px)}
.rail{border-right:1px solid var(--gm-line)!important;padding:14px 8px!important}.rail-profile{margin:4px 0 22px}.rail-profile .avatar{border:2px solid rgba(255,255,255,.18)!important;box-shadow:0 0 25px rgba(57,119,255,.22)!important}.online-dot{background:#26d39a!important;border-color:#07101f!important}
.rail-nav{gap:5px!important}.rail-nav button{color:#8998b7!important;border-radius:14px!important;min-height:58px!important}.rail-nav button:hover{background:rgba(255,255,255,.06)!important;color:#fff!important}.rail-nav .rail-active{background:linear-gradient(135deg,rgba(57,119,255,.28),rgba(118,87,255,.2))!important;color:#fff!important;box-shadow:inset 3px 0 #3977ff,0 8px 25px rgba(57,119,255,.1)!important}.rail-nav b{background:#3977ff!important}
.rail-bottom button{color:#8291af!important}.rail-bottom button:hover{background:rgba(255,255,255,.06)!important;color:#fff!important}
.chat-pane{border-right:1px solid var(--gm-line)!important}.pane-header{padding:24px 20px 13px!important}.pane-header h1{color:#fff!important;font-size:22px!important}.pane-header h1 span{background:linear-gradient(90deg,#4f8bff,#7c67ff);-webkit-background-clip:text;background-clip:text;color:transparent}.pane-header p{color:#8290ae!important}
.profile-mini{border-bottom:1px solid var(--gm-line)!important;background:rgba(255,255,255,.025)}.profile-mini b{color:#f2f6ff!important}.profile-mini .status{color:#38dca3!important}.search-box{background:rgba(255,255,255,.055)!important;border-color:var(--gm-line)!important;color:#8492b0!important}.search-box:focus-within{background:rgba(255,255,255,.08)!important;border-color:rgba(57,119,255,.65)!important;box-shadow:0 0 0 4px rgba(57,119,255,.1)!important}.search-box input{color:#fff!important}.search-box input::placeholder{color:#71809e!important}.people-results{background:#0d1931!important;border-color:var(--gm-line)!important;color:#fff!important}.people-results button:hover{background:rgba(255,255,255,.07)!important}.people-results b{color:#fff!important}.people-results small{color:#8795b1!important}
.filter-tabs{border-bottom-color:var(--gm-line)!important}.filter-tabs button{color:#8190ad!important}.filter-tabs button.selected{background:linear-gradient(135deg,rgba(57,119,255,.28),rgba(118,87,255,.2))!important;color:#fff!important}
.chat-list{padding:5px 8px!important}.chat-row{padding:12px 9px!important;border:1px solid transparent}.chat-row:hover{background:rgba(255,255,255,.055)!important}.chat-row.selected{background:linear-gradient(90deg,rgba(57,119,255,.18),rgba(118,87,255,.09))!important;box-shadow:inset 3px 0 #3977ff!important}.chat-row-copy b{color:#f2f6ff!important}.chat-row-copy p{color:#8491ad!important}.chat-row-copy time{color:#65738f!important}.chat-row .status{color:#71809c!important}.chat-row .status.online{color:#39d99f!important}.chat-empty{color:#7d8ca8!important}.chat-empty b{color:#b9c6db!important}
.quick-actions{border-top-color:var(--gm-line)!important;background:rgba(255,255,255,.018)}.quick-actions>span{color:#73819c!important}.quick-actions button{background:rgba(255,255,255,.045)!important;border-color:var(--gm-line)!important;color:#9aa8c0!important}.quick-actions button:hover{background:rgba(57,119,255,.1)!important;border-color:rgba(57,119,255,.35)!important;color:#fff!important}
.message-header{background:rgba(7,16,31,.86)!important;border-bottom-color:var(--gm-line)!important}.header-copy>b{color:#f4f7ff!important}.header-copy>span{color:#7e8ca8!important}.header-actions button,.mobile-back{color:#8a98b2!important}.header-actions button:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
.message-body{background:radial-gradient(circle at 15% 5%,rgba(57,119,255,.11),transparent 25%),radial-gradient(circle at 88% 75%,rgba(118,87,255,.09),transparent 28%),linear-gradient(180deg,#081222,#0a1528)!important}.today-pill{background:rgba(255,255,255,.06)!important;color:#8290a8!important}.message-bubble{background:rgba(255,255,255,.075)!important;border:1px solid rgba(255,255,255,.06)!important;color:#e7eefb!important;box-shadow:0 8px 25px rgba(0,0,0,.12)!important}.message-row.own .message-bubble{background:linear-gradient(135deg,#3475ff,#665df1)!important;border:0!important;box-shadow:0 10px 28px rgba(50,100,240,.2)!important}.message-bubble small{color:#dfe8ff!important}
.message-menu,.reaction-picker,.emoji-panel{background:#0d1931!important;border-color:var(--gm-line)!important;color:#fff!important}.message-menu button:hover,.reaction-picker button:hover,.emoji-panel button:hover{background:rgba(255,255,255,.07)!important}.composer-area{background:rgba(7,16,31,.9)!important;border-top-color:var(--gm-line)!important}.composer{background:rgba(255,255,255,.055)!important;border-color:var(--gm-line)!important;box-shadow:0 10px 35px rgba(0,0,0,.18)!important}.composer:focus-within{border-color:rgba(57,119,255,.6)!important;box-shadow:0 0 0 4px rgba(57,119,255,.1)!important}.composer input{color:#fff!important}.composer input::placeholder{color:#7786a2!important}.composer>button{color:#8291ae!important}.composer>button:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}.composer .send-button{background:linear-gradient(135deg,#3977ff,#7657ff)!important}.context-bar{background:rgba(255,255,255,.055)!important;color:#8d9ab4!important}
.info-pane{border-left:1px solid var(--gm-line)!important}.info-head{background:rgba(255,255,255,.025)!important;border-bottom-color:var(--gm-line)!important}.info-head h3,.contact-card h2{color:#eef3ff!important}.contact-card>span,.info-section>p{color:#8391ac!important}.info-section{border-top-color:var(--gm-line)!important}.info-section>b{color:#dce5f7!important}.info-actions{border-top-color:var(--gm-line)!important}.info-actions button{color:#a1aec4!important}
.gm-feature-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0 14px 10px}.gm-feature-chip{min-width:0;padding:8px 7px;border:1px solid var(--gm-line);border-radius:12px;background:rgba(255,255,255,.035);color:#aab6ca;text-align:center;font-size:8px;font-weight:800}.gm-feature-chip b{display:block;color:#fff;font-size:9px;margin-bottom:2px}.gm-feature-chip span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.auth-page{min-height:100%;background:radial-gradient(circle at 15% 20%,rgba(32,216,208,.17),transparent 25%),radial-gradient(circle at 85% 78%,rgba(118,87,255,.22),transparent 30%),linear-gradient(135deg,#050b17,#0a1630 52%,#07101f)!important;color:#fff!important}.auth-brand{filter:drop-shadow(0 12px 30px rgba(57,119,255,.2))}.auth-brand b,.auth-brand h1{color:#fff!important}.auth-brand span{color:#5c8dff!important}.auth-brand small{color:#8492ad!important}.auth-card{background:rgba(10,21,40,.84)!important;border:1px solid rgba(255,255,255,.1)!important;box-shadow:0 35px 100px rgba(0,0,0,.38)!important;backdrop-filter:blur(24px);color:#fff!important}.auth-card:before{background:linear-gradient(90deg,#20d8d0,#3977ff,#7657ff,#ff5ca8)!important}.auth-card h1{color:#fff!important}.auth-card>p{color:#8d9ab4!important}.auth-card label{color:#cbd6e9!important}.auth-card label input{background:rgba(255,255,255,.055)!important;border-color:rgba(255,255,255,.1)!important;color:#fff!important}.auth-card label input::placeholder{color:#71809d!important}.auth-card label input:focus{border-color:rgba(57,119,255,.65)!important;box-shadow:0 0 0 4px rgba(57,119,255,.1)!important}.auth-card button[type=submit],.auth-card .primary{background:linear-gradient(135deg,#3977ff,#7657ff)!important;color:#fff!important;box-shadow:0 12px 28px rgba(57,119,255,.22)!important}.gm-auth-features{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:16px 0 2px}.gm-auth-feature{padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.035);font-size:9px;color:#a7b3c8}.gm-auth-feature b{display:block;color:#fff;font-size:10px;margin-bottom:2px}.gm-auth-note{display:flex;align-items:center;gap:6px;margin-top:12px;color:#6f7e9c;font-size:8px}.gm-auth-note i{width:6px;height:6px;border-radius:50%;background:#20d8d0;box-shadow:0 0 10px #20d8d0}
@media(max-width:1000px){.app-shell{grid-template-columns:70px 300px minmax(360px,1fr)!important}.info-pane{display:none}}
@media(max-width:760px){.app-shell{display:block!important;background:#07101f!important}.rail{display:none!important}.chat-pane{position:absolute;inset:0;z-index:2}.message-pane{position:absolute;inset:0;z-index:1}.app-shell.mobile-chat-open .chat-pane{display:none}.app-shell.mobile-chat-open .message-pane{display:flex}.message-header{height:calc(66px + env(safe-area-inset-top));min-height:66px;padding-top:env(safe-area-inset-top)}.mobile-back{display:grid!important}.message-body{padding:16px 10px 8px}.message-bubble{max-width:88%!important}.message-bubble p{font-size:14px!important}.composer-area{padding:8px 8px calc(9px + env(safe-area-inset-bottom))!important}.composer{min-height:53px;height:auto}.composer input{font-size:16px!important}.gm-feature-strip{grid-template-columns:repeat(3,1fr);margin:0 10px 8px}.gm-feature-chip{font-size:7px}.gm-feature-chip b{font-size:8px}.auth-page{padding:18px 12px!important}.auth-card{width:100%!important;padding:24px 18px!important;border-radius:22px!important}.gm-auth-features{grid-template-columns:1fr 1fr}.auth-card label input{font-size:16px!important;height:50px!important}}
  \`;
  document.head.appendChild(style);

  const addAuthFeatures=()=>{
    const page=document.querySelector('.auth-page');
    const card=page?.querySelector('.auth-card');
    if(!page||!card||card.querySelector('.gm-auth-features')) return;
    const form=card.querySelector('form');
    if(!form) return;
    const box=document.createElement('div'); box.className='gm-auth-features';
    [['🔐','Private by design','Self-hosted messaging'],['⚡','Fast & reliable','Realtime delivery'],['📱','Every screen','Web + Android'],['🤖','Smart workspace','Built-in AI tools']].forEach(([icon,title,desc])=>{const item=document.createElement('div');item.className='gm-auth-feature';item.innerHTML=icon+' <b>'+title+'</b><span>'+desc+'</span>';box.appendChild(item)});
    form.insertAdjacentElement('afterend',box);
    const note=document.createElement('div');note.className='gm-auth-note';note.innerHTML='<i></i><span>Your server. Your data. Your Global Messenger.</span>';box.insertAdjacentElement('afterend',note);
  };

  const addFeatureStrip=()=>{
    const pane=document.querySelector('.chat-pane');
    if(!pane||pane.querySelector('.gm-feature-strip')) return;
    const search=pane.querySelector('.search-box');
    if(!search) return;
    const strip=document.createElement('div');strip.className='gm-feature-strip';
    [['🔒','Private','Self-hosted'],['⚡','Realtime','Fast sync'],['📞','Calls','Voice + video']].forEach(([i,t,d])=>{const x=document.createElement('div');x.className='gm-feature-chip';x.innerHTML=i+' <b>'+t+'</b><span>'+d+'</span>';strip.appendChild(x)});
    search.insertAdjacentElement('afterend',strip);
  };

  const cleanupExternalLoginLinks=()=>{
    document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href')||'';if(/github\\.com|onrender\\.com|vercel\\.app|netlify\\.app|railway\\.app/i.test(href)){a.removeAttribute('href');a.setAttribute('role','button');a.onclick=()=>window.dispatchEvent(new CustomEvent('gm:options'))}});
  };
  const run=()=>{addAuthFeatures();addFeatureStrip();cleanupExternalLoginLinks()};
  run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
}
`;
const marker='function App(){';
const idx=source.indexOf(marker);
if(idx<0) throw new Error('Global Messenger App marker not found; market UI patch was not applied.');
source=source.slice(0,idx)+patch+'\n'+source.slice(idx);
source=source.replace('function App(){','function App(){installMarketUI();');
fs.writeFileSync(file,source);
