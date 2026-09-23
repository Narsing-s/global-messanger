// True serverless / peer-to-peer Global Messenger.
// Persistent data lives only in the device's IndexedDB. There is no REST API,
// authentication server, database, Docker service, or message relay.
// WebRTC uses DTLS encryption for the peer connection. Initial signaling is
// intentionally manual (copy/paste SDP) so two devices can pair without a server.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Globe2, Copy, Link2, Send, ShieldCheck, Trash2, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { getContacts, getLocal, getMessages, getProfile, LocalContact, LocalMessage, LocalProfile, saveContacts, saveMessages, saveProfile, clearLocalData } from './p2p-store';
import './styles.css';
import './p2p.css';

const RTC_CONFIG: RTCConfiguration = { iceServers: [] };
const waitForIce = (pc: RTCPeerConnection) => new Promise<void>(resolve => {
  if (pc.iceGatheringState === 'complete') return resolve();
  const timer = window.setTimeout(() => resolve(), 3000);
  pc.addEventListener('icegatheringstatechange', () => {
    if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); }
  });
});

const uid = () => crypto.randomUUID();
const initials = (name: string) => name.trim().split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'GM';
const now = () => new Date().toISOString();

type WireMessage = { kind:'message'; message:LocalMessage };
type PairInvite = { v:1; type:'offer'|'answer'; peerId:string; displayName:string; username:string; sdp:RTCSessionDescriptionInit };

function App() {
  const [profile,setProfile]=useState<LocalProfile|null>(null);
  const [contacts,setContacts]=useState<LocalContact[]>([]);
  const [messages,setMessages]=useState<LocalMessage[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [setupName,setSetupName]=useState('');
  const [setupUsername,setSetupUsername]=useState('');
  const [pairText,setPairText]=useState('');
  const [pairMode,setPairMode]=useState<'offer'|'answer'|'apply'>('offer');
  const [signalText,setSignalText]=useState('');
  const [status,setStatus]=useState('Local-only');
  const [error,setError]=useState('');
  const [draft,setDraft]=useState('');
  const pcs=useRef(new Map<string,RTCPeerConnection>());
  const channels=useRef(new Map<string,RTCDataChannel>());
  const profileRef=useRef<LocalProfile|null>(null);

  useEffect(()=>{(async()=>{
    const [p,c,m]=await Promise.all([getProfile(),getContacts(),getMessages()]);
    if(p){setProfile(p);profileRef.current=p;}
    setContacts(c);setMessages(m);
  })()},[]);

  const active=contacts.find(c=>c.id===activeId)||null;
  const activeMessages=useMemo(()=>messages.filter(m=>m.peerId===activeId),[messages,activeId]);

  async function persistMessages(next:LocalMessage[]){setMessages(next);await saveMessages(next);}
  async function persistContacts(next:LocalContact[]){setContacts(next);await saveContacts(next);}

  async function createProfile(){
    setError('');
    const displayName=setupName.trim(), username=setupUsername.trim().replace(/^@/,'').toLowerCase();
    if(!displayName||username.length<3)return setError('Enter a display name and username (3+ characters).');
    const p={id:uid(),displayName,username,createdAt:now()};
    await saveProfile(p);profileRef.current=p;setProfile(p);
  }

  function closePeer(id:string){
    channels.current.get(id)?.close(); channels.current.delete(id);
    pcs.current.get(id)?.close(); pcs.current.delete(id);
    void persistContacts(contacts.map(c=>c.id===id?{...c,connected:false}:c));
  }

  function wirePeer(id:string,pc:RTCPeerConnection,ch:RTCDataChannel){
    pcs.current.set(id,pc); channels.current.set(id,ch);
    ch.onopen=()=>{setStatus('Peer connected');void persistContacts(contacts.map(c=>c.id===id?{...c,connected:true,lastSeenAt:now()}:c));};
    ch.onclose=()=>{setStatus('Peer disconnected');void persistContacts(contacts.map(c=>c.id===id?{...c,connected:false}:c));};
    ch.onerror=()=>setStatus('Peer connection error');
    ch.onmessage=async e=>{
      try{
        const data=JSON.parse(String(e.data)) as WireMessage;
        if(data.kind!=='message')return;
        const msg={...data.message,peerId:id};
        const current=await getMessages();
        if(current.some(x=>x.id===msg.id))return;
        await persistMessages([...current,msg]);
        setActiveId(id);
      }catch{setError('Received an invalid peer message.');}
    };
    pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))setStatus('Peer offline');};
  }

  async function makeOffer(){
    if(!profile)return;
    setError('');
    const pc=new RTCPeerConnection(RTC_CONFIG);
    const ch=pc.createDataChannel('messages',{ordered:true});
    const tempId='pending-offer';
    wirePeer(tempId,pc,ch);
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitForIce(pc);
    const payload:PairInvite={v:1,type:'offer',peerId:profile.id,displayName:profile.displayName,username:profile.username,sdp:pc.localDescription!};
    setSignalText(JSON.stringify(payload));
    setPairMode('answer');
    setStatus('Offer created — send it to the other device.');
  }

  async function acceptOffer(){
    if(!profile)return;
    setError('');
    try{
      const invite=JSON.parse(signalText) as PairInvite;
      if(invite.v!==1||invite.type!=='offer')throw Error('Paste a valid offer.');
      const pc=new RTCPeerConnection(RTC_CONFIG);
      pc.ondatachannel=e=>wirePeer(invite.peerId,pc,e.channel);
      await pc.setRemoteDescription(invite.sdp);
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await waitForIce(pc);
      const contact={id:invite.peerId,displayName:invite.displayName,username:invite.username,connected:false};
      const next=[contact,...contacts.filter(c=>c.id!==contact.id)];await persistContacts(next);setActiveId(contact.id);
      const payload:PairInvite={v:1,type:'answer',peerId:profile.id,displayName:profile.displayName,username:profile.username,sdp:pc.localDescription!};
      pcs.current.set(invite.peerId,pc);
      setSignalText(JSON.stringify(payload));setPairMode('apply');
      setStatus('Answer created — send it back to the first device.');
    }catch(e:any){setError(e.message||'Could not accept offer.');}
  }

  async function applyAnswer(){
    try{
      const invite=JSON.parse(signalText) as PairInvite;
      if(invite.v!==1||invite.type!=='answer')throw Error('Paste a valid answer.');
      const pc=pcs.current.get('pending-offer');
      if(!pc)throw Error('This device has no pending offer. Create a new offer first.');
      await pc.setRemoteDescription(invite.sdp);
      const contact={id:invite.peerId,displayName:invite.displayName,username:invite.username,connected:false};
      await persistContacts([contact,...contacts.filter(c=>c.id!==contact.id)]);
      setActiveId(contact.id);setPairMode('offer');setStatus('Connecting to peer…');
      pcs.current.set(contact.id,pc);pcs.current.delete('pending-offer');
    }catch(e:any){setError(e.message||'Could not apply answer.');}
  }

  function send(){
    const body=draft.trim();if(!body||!activeId||!profile)return;
    const ch=channels.current.get(activeId);
    if(!ch||ch.readyState!=='open')return setError('Peer is offline. No server is available to queue messages.');
    const msg:LocalMessage={id:uid(),peerId:activeId,senderId:profile.id,senderName:profile.displayName,body,createdAt:now(),status:'delivered'};
    ch.send(JSON.stringify({kind:'message',message:msg} satisfies WireMessage));
    void persistMessages([...messages,msg]);setDraft('');
  }

  async function addContactFromInvite(){
    setError('');
    try{
      const invite=JSON.parse(pairText) as PairInvite;
      if(!invite.peerId||!invite.displayName)throw Error('Invalid peer information.');
      const c={id:invite.peerId,displayName:invite.displayName,username:invite.username||invite.peerId,connected:false};
      await persistContacts([c,...contacts.filter(x=>x.id!==c.id)]);setActiveId(c.id);setPairText('');
    }catch(e:any){setError(e.message||'Invalid contact code.');}
  }

  async function reset(){
    if(!confirm('Delete this device profile, contacts and local messages?'))return;
    for(const pc of pcs.current.values())pc.close();
    pcs.current.clear();channels.current.clear();await clearLocalData();location.reload();
  }

  if(!profile)return <div className="p2p-welcome"><div className="p2p-welcome-card">
    <div className="p2p-brand"><div className="p2p-mark"><Globe2/></div><div><strong>Global Messenger</strong><small>True peer-to-peer edition</small></div></div>
    <h1>Create your device identity</h1>
    <p className="p2p-muted">There is no account server. Your identity, contacts and messages stay in this browser/app.</p>
    <input className="p2p-input" value={setupName} onChange={e=>setSetupName(e.target.value)} placeholder="Display name"/>
    <input className="p2p-input" value={setupUsername} onChange={e=>setSetupUsername(e.target.value)} placeholder="Username"/>
    {error&&<div className="p2p-warning">{error}</div>}
    <button className="p2p-btn p2p-primary" onClick={createProfile}>Create local identity</button>
    <div className="p2p-warning">Keep this device data safe. Clearing app/browser storage removes the identity and local chat history.</div>
  </div></div>;

  const copy=async()=>{await navigator.clipboard?.writeText(signalText);setStatus('Pairing text copied');};
  return <div className="p2p-app">
    <header className="p2p-top"><div className="p2p-brand"><div className="p2p-mark"><Globe2/></div><div><strong>Global Messenger</strong><small>Serverless · Device-owned · P2P</small></div></div>
      <div className="p2p-actions"><span className="p2p-pill"><ShieldCheck size={13}/> DTLS encrypted transport</span><span className="p2p-pill">{status}</span><button className="p2p-btn p2p-danger" onClick={reset}><Trash2 size={15}/></button></div>
    </header>
    <div className="p2p-layout">
      <aside className="p2p-sidebar">
        <div className="p2p-card"><div className="p2p-row"><div className="p2p-avatar">{initials(profile.displayName)}</div><div><b>{profile.displayName}</b><div className="p2p-muted">@{profile.username}</div></div></div><div className="p2p-muted" style={{marginTop:10}}>Device ID: {profile.id}</div></div>
        <div className="p2p-card"><h3><Link2 size={16}/> Pair a device</h3><p className="p2p-muted">No signaling server is used. Exchange the text below manually.</p>
          <div className="p2p-actions"><button className="p2p-btn p2p-primary" onClick={makeOffer}>Create offer</button><button className="p2p-btn" onClick={()=>setPairMode('answer')}>I received an offer</button></div>
          <textarea className="p2p-textarea" value={signalText} onChange={e=>setSignalText(e.target.value)} placeholder="Paste offer/answer here"/>
          <div className="p2p-actions"><button className="p2p-btn" onClick={pairMode==='answer'?acceptOffer:applyAnswer}>{pairMode==='answer'?'Create answer':'Apply answer'}</button>{signalText&&<button className="p2p-btn" onClick={copy}><Copy size={15}/> Copy</button>}</div>
          {error&&<div className="p2p-warning">{error}</div>}
        </div>
        <div className="p2p-card"><h3><UserPlus size={16}/> Contacts</h3>{contacts.length===0?<div className="p2p-muted">No contacts yet. Pair with another device.</div>:contacts.map(c=><button className={'p2p-contact '+(activeId===c.id?'active':'')} key={c.id} onClick={()=>setActiveId(c.id)}><span className="p2p-avatar">{initials(c.displayName)}</span><span><b>{c.displayName}</b><br/><small className="p2p-muted">@{c.username}</small></span><span className={'p2p-dot '+(c.connected?'on':'')}/></button>)}</div>
      </aside>
      <main className="p2p-main">
        {!active?<div className="p2p-empty"><Globe2 size={52}/><h2>Private peer-to-peer messaging</h2><p>Create an offer on this device, exchange it with another device, then chat directly.</p><span className="p2p-pill"><WifiOff size={13}/> No server required</span></div>:
        <><header className="p2p-chat-head"><div className="p2p-avatar">{initials(active.displayName)}</div><div><h2>{active.displayName}</h2><small>@{active.username} · {active.connected?'Connected directly':'Offline'}</small></div><span className="p2p-pill" style={{marginLeft:'auto'}}>{active.connected?<><Wifi size={13}/> P2P online</>:<><WifiOff size={13}/> offline</>}</span></header>
        <div className="p2p-messages">{activeMessages.length===0?<div className="p2p-empty"><p>No local messages yet.</p></div>:activeMessages.map(m=><div key={m.id} className={'p2p-msg '+(m.senderId===profile.id?'mine':'')}><div>{m.body}</div><small>{m.senderName} · {new Date(m.createdAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</small></div>)}</div>
        <div className="p2p-composer"><input className="p2p-input" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={active.connected?'Type a message…':'Peer is offline — messages are not queued on a server'}/><button className="p2p-btn p2p-primary" onClick={send} disabled={!active.connected}><Send size={17}/> Send</button></div></>}
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
