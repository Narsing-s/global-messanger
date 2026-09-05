import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
if (source.includes('gm-unique-ui-v3')) process.exit(0);

const ui = `
// gm-unique-ui-v3
function injectUniqueUI(){
  if(document.getElementById('gm-unique-ui-v3')) return;
  const style=document.createElement('style');
  style.id='gm-unique-ui-v3';
  style.textContent=\`
:root{--gm-navy:#0b1020;--gm-navy2:#111a33;--gm-violet:#7657ff;--gm-cyan:#25d9d2;--gm-pink:#ff5ca8;--gm-text:#172033;--gm-muted:#7b8498;--gm-border:#e8ebf3;--gm-soft:#f6f7fb;--gm-card:#fff;--gm-glow:0 18px 55px rgba(38,31,92,.12)}
*{scrollbar-width:thin}
body{background:var(--gm-soft)}
.shell{background:var(--gm-soft);gap:0}
.sidebar{width:318px;background:linear-gradient(180deg,#0b1020 0,#101832 52%,#121a31 100%);color:#fff;border:0;box-shadow:14px 0 45px rgba(11,16,32,.16);padding-bottom:10px}
.brand{height:82px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.brand-icon{width:44px;height:44px;border-radius:15px;background:radial-gradient(circle at 28% 20%,#25d9d2 0,#7657ff 48%,#ff5ca8 100%);box-shadow:0 0 32px rgba(118,87,255,.45);position:relative}
.brand-icon:after{content:'';position:absolute;inset:7px;border:1px solid rgba(255,255,255,.55);border-radius:12px}
.brand b{color:#fff;font-size:18px}.brand span{color:#8f9ab5;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.profile{margin:14px 12px 12px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.055);backdrop-filter:blur(16px)}
.profile-text b{color:#fff}.profile-text span{color:#8994b0}.profile .icon-btn{color:#b9c2d6}.profile .icon-btn:hover{background:rgba(255,255,255,.1);color:#fff}
.avatar{box-shadow:0 6px 18px rgba(11,16,32,.16)}
.search{margin:4px 14px 13px;height:46px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.065);border-radius:15px;color:#8793af}.search:focus-within{background:rgba(255,255,255,.11);border-color:rgba(37,217,210,.55);box-shadow:0 0 0 4px rgba(37,217,210,.08)}.search input{color:#fff}.search input::placeholder{color:#7e89a4}
.search-results{top:196px;background:#111a33;border:1px solid rgba(255,255,255,.12);box-shadow:var(--gm-glow);color:#fff}.search-results button:hover{background:rgba(255,255,255,.07)}.search-results b{color:#fff}.search-results span{color:#8793af}
.nav{padding:0 12px 14px;grid-template-columns:1fr 1fr;gap:6px}.nav button{height:42px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.035);color:#aab3c7;border-radius:12px}.nav button:hover{background:rgba(255,255,255,.08);color:#fff}.nav button.active{background:linear-gradient(135deg,#7657ff,#5e70ff);color:#fff;box-shadow:0 10px 24px rgba(118,87,255,.28)}.nav span{background:rgba(255,255,255,.17);color:#fff}
.section-title{color:#69748f;padding:10px 20px 6px;letter-spacing:.16em}.chat-list{padding:4px 8px}.chat-item{padding:11px 9px;border:1px solid transparent;border-radius:15px;color:#fff}.chat-item:hover{background:rgba(255,255,255,.055)}.chat-item.selected{background:linear-gradient(90deg,rgba(118,87,255,.23),rgba(37,217,210,.07));border-color:rgba(118,87,255,.26);box-shadow:inset 3px 0 0 #7657ff}.chat-copy b{color:#f4f6fb}.chat-copy p{color:#7f8aa5}.chat-copy small{color:#66718b}.user-status{color:#7e8aa4}.user-status.online{color:#45d5a0}.empty-side{color:#71809d}.empty-side p{color:#b6c0d3}
.conversation{background:#fff;position:relative}
.topbar{height:82px;padding:0 24px;background:rgba(255,255,255,.9);backdrop-filter:blur(18px);border-bottom:1px solid var(--gm-border);box-shadow:0 4px 25px rgba(17,24,39,.045);position:relative;z-index:3}.topbar:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#7657ff55,#25d9d255,transparent)}
.chat-heading b{font-size:15px;color:#162037}.chat-heading span{color:#7c869a}.top-actions .icon-btn{border:1px solid #edf0f5;background:#fafbfe}.top-actions .icon-btn:hover{background:#111a33;color:#fff;border-color:#111a33;transform:translateY(-1px)}
.messages{padding:28px max(5%,72px);background:radial-gradient(circle at 20% 0,rgba(118,87,255,.055),transparent 28%),radial-gradient(circle at 90% 30%,rgba(37,217,210,.04),transparent 25%),#fff}.day span{background:#f3f4f8;border:1px solid #e9ebf2;color:#8a93a5;padding:6px 12px}
.bubble-row{margin:10px 0}.bubble{max-width:min(72%,590px);padding:11px 14px;border:1px solid #e9ebf2;border-radius:18px 18px 18px 5px;background:#f7f8fb;box-shadow:0 5px 18px rgba(17,24,39,.035)}.own .bubble{border:0;background:linear-gradient(135deg,#7657ff,#5e70ff 60%,#6375ff);border-radius:18px 18px 5px 18px;box-shadow:0 10px 26px rgba(94,112,255,.2)}.bubble p{font-size:13px}.bubble small{font-size:9px}.bubble-menu{width:30px;height:30px;border:1px solid #e7eaf2}.own .bubble-menu{border:0}.message-menu,.emoji-picker,.emoji-panel{border:1px solid #e7eaf2;box-shadow:0 22px 55px rgba(17,24,39,.18);border-radius:15px}
.composer-wrap{padding:11px max(5%,72px) 18px;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border-top:1px solid #edf0f5}.composer{height:58px;border:1px solid #dfe3ec;border-radius:19px;padding:0 7px 0 5px;box-shadow:0 10px 35px rgba(17,24,39,.075);transition:.2s}.composer:focus-within{border-color:#bfc6f3;box-shadow:0 12px 40px rgba(118,87,255,.12),0 0 0 4px rgba(118,87,255,.05)}.composer .icon-btn:hover{background:#f0efff;color:#7657ff}.send{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#7657ff,#5e70ff);box-shadow:0 9px 20px rgba(94,112,255,.25);transition:.18s}.send:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(94,112,255,.3)}
.socket-error{border:1px solid #ffd6d9}.reply-bar{border:1px solid #e7e9f2;background:#f8f8fc;border-radius:12px}
.modal-backdrop{background:rgba(7,11,25,.68);backdrop-filter:blur(10px)}.modal{border:1px solid #e6e9f2;box-shadow:0 35px 100px rgba(7,11,25,.3);border-radius:24px}
.primary{background:linear-gradient(135deg,#7657ff,#5e70ff);box-shadow:0 10px 22px rgba(94,112,255,.2)}
.welcome-home{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 40%,#fff,transparent 50%),radial-gradient(circle at 20% 20%,rgba(118,87,255,.09),transparent 30%),radial-gradient(circle at 80% 70%,rgba(37,217,210,.07),transparent 28%)}
.welcome-home:before,.welcome-home:after{content:'';position:absolute;border:1px solid rgba(118,87,255,.09);border-radius:50%;pointer-events:none}.welcome-home:before{width:420px;height:420px}.welcome-home:after{width:620px;height:620px}
.welcome-icon{width:78px;height:78px;border-radius:26px;background:linear-gradient(135deg,#0b1020,#7657ff);box-shadow:0 22px 55px rgba(118,87,255,.25);z-index:1}.welcome-home h1,.welcome-home p{z-index:1}.welcome-home h1{font-size:31px;letter-spacing:-.04em}.welcome-home p{max-width:430px;line-height:1.7;color:#7c8699}
.gm-action-dock{position:relative;z-index:2;display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin-top:24px}.gm-action-dock button{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid #e6e9f1;border-radius:13px;background:rgba(255,255,255,.85);color:#4f5a70;font-size:11px;font-weight:800;box-shadow:0 7px 20px rgba(17,24,39,.055);transition:.18s}.gm-action-dock button:hover{transform:translateY(-2px);border-color:#cdd2f4;color:#7657ff;box-shadow:0 12px 25px rgba(118,87,255,.12)}
.gm-login-tools{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.gm-login-tools a,.gm-login-tools button{height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font:800 11px system-ui,sans-serif;cursor:pointer}.gm-login-install{background:linear-gradient(135deg,#7657ff,#5e70ff);color:#fff;border:0;box-shadow:0 9px 20px rgba(94,112,255,.2)}.gm-login-help{background:#f6f7fb;color:#303a51;border:1px solid #e2e6ef}.gm-login-help:hover{background:#111a33;color:#fff}.gm-login-install:hover{transform:translateY(-1px)}
.auth-page{background:radial-gradient(circle at 12% 18%,rgba(37,217,210,.17),transparent 28%),radial-gradient(circle at 90% 80%,rgba(118,87,255,.2),transparent 32%),linear-gradient(135deg,#f8f9fd,#eef1ff)}
.auth-card{width:min(440px,calc(100% - 32px));padding:34px;border:1px solid rgba(255,255,255,.9);border-radius:28px;box-shadow:0 35px 100px rgba(23,29,55,.14);position:relative;overflow:hidden}.auth-card:before{content:'';position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#25d9d2,#7657ff,#ff5ca8)}.auth-logo{width:62px;height:62px;border-radius:20px;background:linear-gradient(135deg,#0b1020,#7657ff);box-shadow:0 15px 35px rgba(118,87,255,.25)}.auth-card h1{font-size:28px;letter-spacing:-.04em}.auth-card>p{line-height:1.6}.auth-card label input{height:48px;border-radius:13px;background:#fafbfe}.auth-card label input:focus{border-color:#9da5ed;box-shadow:0 0 0 4px rgba(118,87,255,.08)}.switch{color:#7657ff}
button:focus-visible,input:focus-visible{outline:3px solid rgba(118,87,255,.2);outline-offset:2px}
@media(max-width:760px){.sidebar{width:100%;background:linear-gradient(180deg,#0b1020,#111a33)}.brand{height:70px;padding:0 16px}.profile{margin:9px 10px 8px}.search{margin:4px 11px 10px}.nav{padding:0 9px 10px}.chat-item{padding:12px 9px}.topbar{height:calc(66px + env(safe-area-inset-top));min-height:66px;padding:env(safe-area-inset-top) 7px 0}.messages{padding:15px 10px 9px}.bubble{max-width:88%;padding:10px 12px}.bubble p{font-size:14px}.composer-wrap{padding:8px 8px calc(9px + env(safe-area-inset-bottom))}.composer{min-height:53px;height:auto;border-radius:17px}.composer input{font-size:16px}.top-actions .icon-btn{width:40px;height:40px}.back-btn{width:40px;height:40px}.welcome-home h1{font-size:26px}.gm-action-dock{padding:0 15px}.gm-action-dock button{padding:10px 11px}.auth-page{padding:18px 14px}.auth-card{width:100%;padding:27px 20px;border-radius:22px}.gm-login-tools{grid-template-columns:1fr}.gm-login-tools a,.gm-login-tools button{height:46px}.auth-card label input{height:50px;font-size:16px}}
  \`;
  document.head.appendChild(style);

  const loginTools=()=>{
    const card=document.querySelector('.auth-card');
    if(!card||localStorage.getItem('gm_token')){document.getElementById('gm-login-tools')?.remove();return;}
    const form=card.querySelector('form');
    const submit=Array.from(card.querySelectorAll('button')).find(b=>/^(sign in|login)$/i.test((b.textContent||'').trim()));
    if(!form||!submit||/create account|register|display name/i.test(card.textContent||'')){document.getElementById('gm-login-tools')?.remove();return;}
    let tools=document.getElementById('gm-login-tools');
    if(!tools){
      tools=document.createElement('div');tools.id='gm-login-tools';tools.className='gm-login-tools';
      const install=document.createElement('a');install.className='gm-login-install';install.href='https://github.com/Narsing-s/global-messanger/releases/latest/download/Global-Messenger.apk';install.target='_blank';install.rel='noopener noreferrer';install.innerHTML='📱 <span>Install App</span>';install.setAttribute('aria-label','Install Global Messenger');
      const help=document.createElement('button');help.type='button';help.className='gm-login-help';help.innerHTML='❓ <span>Help Centre</span>';help.onclick=()=>window.open('https://global-messenger-help-centre.onrender.com/','_blank','noopener,noreferrer');
      tools.append(install,help);submit.insertAdjacentElement('afterend',tools);
    }
  };
  const welcomeTools=()=>{
    const home=document.querySelector('.welcome-home');
    if(!home||document.getElementById('gm-action-dock')){if(!home)document.getElementById('gm-action-dock')?.remove();return;}
    const dock=document.createElement('div');dock.id='gm-action-dock';dock.className='gm-action-dock';
    const actions=[['⌕','Find people',()=>document.querySelector('.search input')?.focus()],['＋','New group',()=>document.querySelector('.nav button:nth-child(2)')?.click()],['✨','Smart Assist',()=>document.querySelector('.composer input')?.focus()],['⚡','Quick start',()=>document.querySelector('.search input')?.focus()]];
    actions.forEach(([icon,label,fn])=>{const b=document.createElement('button');b.type='button';b.innerHTML='<span>'+icon+'</span><span>'+label+'</span>';b.onclick=fn;dock.appendChild(b)});
    home.appendChild(dock);
  };
  const sync=()=>{loginTools();welcomeTools()};
  sync();
  new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
}
`;

const marker='function App(){';
if(!source.includes(marker)) throw new Error('Global Messenger App marker not found; unique UI patch was not applied.');
source=source.replace(marker,ui+'\n'+marker+'injectUniqueUI();');
fs.writeFileSync(file,source);
