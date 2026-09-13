const BASE=(process.env.E2E_BASE_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
const timeout=Number(process.env.E2E_TIMEOUT_MS||15000);
async function req(path,{token,method='GET',body,expected=[200]}={}){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(BASE+path,{method,signal:c.signal,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={message:text}}if(!expected.includes(r.status))throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0,300)}`);return data;}finally{clearTimeout(t)}}
const u=s=>`${s}${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`.slice(0,20);
let failures=[];
try{
 const a=await req('/api/auth/register',{method:'POST',body:{username:u('ra'),displayName:'Remainder A',password:'GlobalMessenger!123'},expected:[201]});
 const b=await req('/api/auth/register',{method:'POST',body:{username:u('rb'),displayName:'Remainder B',password:'GlobalMessenger!123'},expected:[201]});
 const la=await req('/api/auth/login',{method:'POST',body:{username:a.user.username,password:'GlobalMessenger!123'}}); const lb=await req('/api/auth/login',{method:'POST',body:{username:b.user.username,password:'GlobalMessenger!123'}});
 const ta=la.token,tb=lb.token;
 await req('/api/profile/me',{token:ta});
 await req('/api/profile/me',{token:ta,method:'PATCH',body:{displayName:'Remainder A Updated',bio:'Advanced messenger'}});
 await req('/api/privacy/settings',{token:ta,method:'PATCH',body:{lastSeen:'contacts',profilePhoto:'contacts'}});
 await req('/api/security/status',{token:ta});
 await req('/api/account/login-history',{token:ta});
 await req('/api/security/2fa/setup',{token:ta});
 const conv=await req('/api/conversations/direct',{token:ta,method:'POST',body:{userId:b.user.id}});
 const cid=conv.id;
 await req(`/api/conversations/${cid}/organization`,{token:ta,method:'PATCH',body:{favorite:true,pinned:true,mutedUntil:null,disappearingSeconds:86400}});
 await req('/api/conversations/organized?filter=favorites',{token:ta});
 const msg=await req(`/api/conversations/${cid}/messages`,{token:ta,method:'POST',body:{body:'Remainder E2E message',type:'text'},expected:[200,201]});
 const mid=msg.id||msg.message?.id; if(!mid) throw new Error('Could not create test message');
 await req(`/api/messages/${mid}/info`,{token:ta});
 await req('/api/messages/bulk-forward',{token:ta,method:'POST',body:{messageIds:[mid],conversationId:cid},expected:[200,201]});
 await req('/api/messages/bulk-delete',{token:ta,method:'POST',body:{messageIds:[mid]}});
 const poll=await req('/api/polls',{token:ta,method:'POST',body:{conversationId:cid,question:'E2E poll?',options:['Yes','No'],multiple:false},expected:[200,201]});
 if(poll?.poll?.options?.[0]?.id) await req(`/api/polls/${poll.poll.id}/vote`,{token:tb,method:'POST',body:{optionIds:[poll.poll.options[0].id]}});
 await req('/api/messages/schedule',{token:ta,method:'POST',body:{conversationId:cid,body:'Scheduled E2E message',scheduledAt:new Date(Date.now()+120000).toISOString()},expected:[200,201]});
 const scheduled=await req('/api/messages/scheduled',{token:ta}); if(Array.isArray(scheduled)&&scheduled[0]?.id) await req(`/api/messages/scheduled/${scheduled[0].id}`,{token:ta,method:'DELETE'});
 await req(`/api/search/universal?q=${encodeURIComponent('Remainder')}`,{token:ta});
 await req('/api/blocked/'+b.user.id,{token:ta,method:'POST'}); await req('/api/blocked',{token:ta}); await req('/api/blocked/'+b.user.id,{token:ta,method:'DELETE'});
 console.log('PASS: remainder-feature E2E profile/privacy/security/organization/message-info/bulk/poll/schedule/search/block');
}catch(e){failures.push(e instanceof Error?e.message:String(e));}
if(failures.length){console.error('FAIL: remainder-feature E2E');failures.forEach(x=>console.error('- '+x));process.exit(1)}
