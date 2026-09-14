import fs from 'node:fs';
import path from 'node:path';
const file=path.join(process.cwd(),'src','components','CompleteOperationsCenter.tsx');
let s=fs.readFileSync(file,'utf8');
const r=[
["request('/api/notifications').then(x=>setStatus(JSON.stringify(x)))","run(()=>request('/api/notifications/history'),'Notification history loaded')"],
["request('/api/notifications/preferences')","run(()=>request('/api/account/preferences'),'Notification preferences loaded')"],
["setStatus('Open the conversation call controls for voice/video.')","activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'audio',conversationId:activeChat.id}}))"],
["setStatus('Open the conversation call controls for video.')","activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'video',conversationId:activeChat.id}}))"],
["setStatus('Screen sharing is available from the active call.')","window.dispatchEvent(new CustomEvent('gm:screen-share'))"],
["{cards.map(c=><button className=\"goc-card\" key={c[0]}><span>Operation group</span><b>{c[0]}</b><small className=\"goc-muted\">{c[1]}</small></button>)}","{cards.map(c=><button className=\"goc-card\" key={c[0]} onClick={()=>{const map:any={Chat:'messages','Message control':'messages',Search:'people',Media:'media',Notifications:'notify',Calls:'calls',Security:'security',Reliability:'messages',Globalization:'access',Data:'data',Trust:'safety',Platform:'developer'};setSection(map[c[0]]||'overview')}}><span>Operation group</span><b>{c[0]}</b><small className=\"goc-muted\">{c[1]}</small></button>)}"],
["<button className=\"action\" onClick={()=>run(securityApi.twoFactorStatus,'2FA status loaded')}>2FA status</button>","<button className=\"action\" onClick={()=>run(securityApi.twoFactorStatus,'2FA status loaded')}>2FA status</button><button className=\"action\" onClick={async()=>{const r:any=await run(securityApi.setupTwoFactor,'2FA setup created');if(r?.secret){setStatus(`Authenticator secret: ${r.secret}`);const code=prompt('Enter the 6-digit authenticator code');if(code)await run(()=>securityApi.verifyTwoFactor(code),'2FA enabled')}}}>Set up & verify 2FA</button><button className=\"action danger\" onClick={()=>run(securityApi.logoutOtherDevices,'Other devices revoked')}>Revoke other devices</button>"]
];
for(const [a,b] of r)if(s.includes(a))s=s.replace(a,b);

// Make organization controls mutate server state instead of only loading filters.
const organizeAnchor='<p className="goc-muted">Server-backed organization filters are centralized here.</p>';
const organizeExtra='<div className="goc-panel"><h3>Active chat controls</h3><div className="goc-row"><button className="action" disabled={!activeChat} onClick={()=>activeChat&&run(()=>organizationApi.update(activeChat.id,{favorite:true}),'Added to favorites')}>Favorite</button><button className="action" disabled={!activeChat} onClick={()=>activeChat&&run(()=>organizationApi.update(activeChat.id,{pinned:true}),'Chat pinned')}>Pin</button><button className="action" disabled={!activeChat} onClick={()=>activeChat&&run(()=>organizationApi.update(activeChat.id,{archived:true}),'Chat archived')}>Archive</button><button className="action" disabled={!activeChat} onClick={()=>activeChat&&run(()=>organizationApi.update(activeChat.id,{favorite:false,pinned:false,archived:false}),'Organization reset')}>Reset</button></div></div>';
if(s.includes(organizeAnchor)&&!s.includes('Active chat controls'))s=s.replace(organizeAnchor,organizeAnchor+organizeExtra);

// Add privacy controls to the security surface using the already authenticated profile API.
const securityHead='<h2>Security</h2>';
const privacyExtra='<div className="goc-panel"><h3>Privacy controls</h3><div className="goc-row"><button className="action" onClick={()=>run(()=>profileApi.updatePrivacy({lastSeen:"everyone",profilePhoto:"everyone"}),'Privacy: everyone')}>Everyone</button><button className="action" onClick={()=>run(()=>profileApi.updatePrivacy({lastSeen:"contacts",profilePhoto:"contacts"}),'Privacy: contacts')}>Contacts</button><button className="action" onClick={()=>run(()=>profileApi.updatePrivacy({lastSeen:"nobody",profilePhoto:"nobody"}),'Privacy: nobody')}>Nobody</button></div></div>';
if(s.includes(securityHead)&&!s.includes('Privacy controls'))s=s.replace(securityHead,securityHead+privacyExtra);

// Replace the calls panel's status-only actions with the canonical event bridge.
const oldCallText='Calls</h2><p className="goc-muted">Incoming/outgoing call controls remain in the canonical conversation call surface to prevent duplicate call UIs.</p>';
if(s.includes(oldCallText)&&!s.includes("detail:{type:'audio',conversationId:activeChat.id}")){
  s=s.replace(oldCallText,'Calls</h2><p className="goc-muted">Calls use the canonical realtime WebRTC surface.</p>');
}

fs.writeFileSync(file,s);
console.log('[operations-hardening] complete real-operation wiring applied');
