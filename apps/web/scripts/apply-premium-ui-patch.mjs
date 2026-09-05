import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
if (source.includes('gm-premium-ui-v2')) process.exit(0);

const premiumUi = `
// gm-premium-ui-v2
function injectPremiumUI(){
  if(document.getElementById('gm-premium-ui-v2')) return;
  const style=document.createElement('style');
  style.id='gm-premium-ui-v2';
  style.textContent=\`
:root{--gm-primary:#5b5ce2;--gm-primary2:#7c5cff;--gm-ink:#182033;--gm-muted:#7b8498;--gm-line:#e8eaf2;--gm-bg:#f6f7fb;--gm-card:#fff;--gm-shadow:0 14px 40px rgba(24,32,51,.09)}
html,body,#root{background:var(--gm-bg);color:var(--gm-ink)}
.shell{background:var(--gm-bg)}
.sidebar{width:350px;background:rgba(255,255,255,.97);border-right:1px solid var(--gm-line);box-shadow:8px 0 30px rgba(24,32,51,.035)}
.brand{height:78px;padding:0 22px;border-bottom:1px solid #f0f1f6}.brand-icon{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--gm-primary),var(--gm-primary2));box-shadow:0 8px 20px rgba(91,92,226,.25)}.brand b{font-size:18px;letter-spacing:-.02em}.brand span{font-size:11px;color:#9299aa}
.profile{margin:12px 12px 8px;padding:11px 12px;border:1px solid #edf0f6;border-radius:16px;background:#fbfcff}.profile:hover{border-color:#dfe2f1;box-shadow:var(--gm-shadow)}
.search{height:46px;margin:4px 16px 13px;border:1px solid #e5e8f0;background:#f5f6fa;border-radius:14px;transition:.18s}.search:focus-within{background:#fff;border-color:#cdd1ee;box-shadow:0 0 0 4px rgba(91,92,226,.08)}
.nav{padding:0 12px 12px;grid-template-columns:1fr 1fr;gap:7px}.nav button{height:42px;border-radius:12px;justify-content:center}.nav button.active{background:linear-gradient(135deg,#eeeefe,#e9eaff);color:#5557d9;box-shadow:inset 0 0 0 1px #e0e2fa}
.section-title{padding:12px 21px 7px;color:#a0a6b6}.chat-list{padding:3px 9px}.chat-item{padding:11px 10px;border:1px solid transparent;border-radius:14px;transition:.16s}.chat-item:hover{background:#f7f8fc}.chat-item.selected{background:#eef0ff;border-color:#e0e2fa;box-shadow:0 6px 18px rgba(91,92,226,.07)}
.chat-copy b{color:#263047}.chat-copy p{color:#8a92a3}
.conversation{background:#fff}.topbar{height:78px;padding:0 25px;background:rgba(255,255,255,.96);border-bottom:1px solid var(--gm-line);box-shadow:0 2px 14px rgba(24,32,51,.035)}.chat-heading b{font-size:15px;letter-spacing:-.01em}.top-actions{gap:5px}.top-actions .icon-btn:hover{background:#eef0ff;color:#5557d9}
.messages{padding:28px max(6%,80px);background:radial-gradient(circle at 50% 0,#fbfcff 0,#fff 46%)}.day span{background:#f3f4f8;border:1px solid #eceef4;color:#8b93a3}
.bubble{max-width:min(65%,560px);padding:11px 14px;border-radius:17px 17px 17px 6px;background:#f1f3f8;box-shadow:0 2px 8px rgba(24,32,51,.025)}.own .bubble{background:linear-gradient(135deg,var(--gm-primary),#696af0);border-radius:17px 17px 6px 17px;box-shadow:0 8px 20px rgba(91,92,226,.18)}.bubble p{font-size:13px}.bubble-menu{width:30px;height:30px}
.composer-wrap{padding:12px max(6%,80px) 20px;background:#fff;border-top:1px solid #f0f1f5}.composer{height:56px;border:1px solid #dfe3ed;border-radius:18px;padding:0 8px 0 6px;box-shadow:0 7px 28px rgba(24,32,51,.07);transition:.18s}.composer:focus-within{border-color:#c9ccee;box-shadow:0 8px 30px rgba(91,92,226,.11),0 0 0 4px rgba(91,92,226,.05)}.composer input{font-size:13px}.send{width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,var(--gm-primary),#696af0);box-shadow:0 7px 16px rgba(91,92,226,.2)}
.emoji-panel,.message-menu{border-color:#e7e9f0;box-shadow:0 18px 45px rgba(24,32,51,.16)}
.modal-backdrop{backdrop-filter:blur(8px)}.modal{border:1px solid #eceef4;box-shadow:0 30px 90px rgba(24,32,51,.18)}.primary{background:linear-gradient(135deg,var(--gm-primary),#696af0);box-shadow:0 7px 16px rgba(91,92,226,.16)}
button:focus-visible,input:focus-visible{outline:3px solid rgba(91,92,226,.2);outline-offset:2px}
@media(max-width:760px){.sidebar{width:100%;background:#f8f9fc}.brand{height:68px;padding:0 16px}.profile{margin:8px 10px 7px}.search{margin:4px 12px 10px}.nav{padding:0 10px 9px}.section-title{padding:10px 17px 6px}.chat-list{padding:2px 7px}.chat-item{padding:12px 9px}.topbar{height:calc(64px + env(safe-area-inset-top));min-height:64px;padding:env(safe-area-inset-top) 8px 0}.messages{padding:15px 10px 10px}.bubble{max-width:88%;padding:10px 13px}.composer-wrap{padding:8px 9px calc(9px + env(safe-area-inset-bottom))}.composer{min-height:52px;height:auto;border-radius:17px}.composer input{font-size:16px}.top-actions .icon-btn{width:40px;height:40px}.back-btn{width:40px;height:40px}}
  \`;
  document.head.appendChild(style);
}
`;

const marker='function App(){';
if(!source.includes(marker)) throw new Error('Global Messenger App marker not found; premium UI patch was not applied.');
source=source.replace(marker,premiumUi+'\n'+marker+'injectPremiumUI();');
fs.writeFileSync(file,source);
