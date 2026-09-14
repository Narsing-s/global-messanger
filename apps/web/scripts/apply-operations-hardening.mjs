import fs from 'node:fs';
import path from 'node:path';
const file=path.join(process.cwd(),'src','components','CompleteOperationsCenter.tsx');
let s=fs.readFileSync(file,'utf8');
const r=[
["request('/api/notifications').then(x=>setStatus(JSON.stringify(x)))","request('/api/notifications/history').then(x=>setStatus(JSON.stringify(x)))"],
["request('/api/notifications/preferences')","request('/api/account/preferences').then(x=>setStatus(JSON.stringify(x)))"],
["setStatus('Open the conversation call controls for voice/video.')","activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'audio',conversationId:activeChat.id}}))"],
["setStatus('Open the conversation call controls for video.')","activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'video',conversationId:activeChat.id}}))"],
["setStatus('Screen sharing is available from the active call.')","window.dispatchEvent(new CustomEvent('gm:screen-share',{detail:{conversationId:activeChat?.id}}))"],
["{cards.map(c=><button className=\"goc-card\" key={c[0]}><span>Operation group</span><b>{c[0]}</b><small className=\"goc-muted\">{c[1]}</small></button>)}","{cards.map(c=><button className=\"goc-card\" key={c[0]} onClick={()=>{const map:any={Chat:'messages','Message control':'messages',Search:'people',Media:'media',Notifications:'notify',Calls:'calls',Security:'security',Reliability:'messages',Globalization:'access',Data:'data',Trust:'safety',Platform:'developer'};setSection(map[c[0]]||'overview')}}><span>Operation group</span><b>{c[0]}</b><small className=\"goc-muted\">{c[1]}</small></button>)}"],
["<button className=\"action\" onClick={()=>run(securityApi.twoFactorStatus,'2FA status loaded')}>2FA status</button>","<button className=\"action\" onClick={()=>run(securityApi.twoFactorStatus,'2FA status loaded')}>2FA status</button><button className=\"action\" onClick={()=>run(securityApi.setupTwoFactor,'2FA setup started')}>Set up 2FA</button><button className=\"action danger\" onClick={()=>run(securityApi.logoutOtherDevices,'Other devices revoked')}>Revoke other devices</button>"]
];
for(const [a,b] of r)if(s.includes(a))s=s.replace(a,b);
fs.writeFileSync(file,s);
console.log('[operations-hardening] canonical operations center hardened');
