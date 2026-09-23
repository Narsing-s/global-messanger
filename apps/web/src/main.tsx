// Global Messenger — full-stack Messenger experience.
// Authentication, conversations, groups, folders and messages are server-backed.
// The browser keeps only the active session token needed by the existing API.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import {
  Archive, Bell, CheckCheck, ChevronLeft, Copy, Heart, LogIn, LogOut,
  MessageCircle, MoreVertical, Paperclip, Plus, Search, Send, Settings,
  ShieldCheck, Smile, Star, Trash2, UserPlus, Users, X
} from 'lucide-react';
import { api, API } from './api';
import './styles.css';

type User={id:string;username:string;displayName:string;avatarUrl?:string|null;lastSeenAt?:string};
type Member={user:User;favoriteAt?:string|null;archivedAt?:string|null};
type Message={id:string;conversationId:string;senderId:string;body:string;createdAt:string;editedAt?:string|null;deletedAt?:string|null;sender?:User;type?:string;attachmentUrl?:string|null;attachmentName?:string|null;attachmentMime?:string|null;attachmentSize?:number|null;replyToId?:string|null};
type Chat={id:string;isGroup:boolean;title?:string|null;members:Member[];messages?:Message[];favorite?:boolean;archived?:boolean;unreadCount?:number};
type Folder='all'|'unread'|'groups'|'favorites'|'archived';
const normalizeChat=(c:any):Chat=>({...c,favorite:!!(c.favorite ?? c.members?.some((m:any)=>m.favoriteAt)),archived:!!(c.archived ?? c.members?.some((m:any)=>m.archivedAt)),unreadCount:Number(c.unreadCount??0)});

const initials=(s:string)=>s.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'GM';
const time=(v?:string)=>v?new Date(v).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'';
const nameOf=(c:Chat,me:string)=>c.isGroup?(c.title||'Group'):(c.members.find(m=>m.user.id!==me)?.user.displayName||'Conversation');

function Avatar({user,name,size='md'}:{user?:User|null;name?:string;size?:string}) {
  const label=name||user?.displayName||'Global Messenger';
  return <div className={'avatar '+size}>{user?.avatarUrl?<img src={user.avatarUrl} alt="" />:initials(label)}</div>;
}

function Auth({onLogin}:{onLogin:(u:User,t:string)=>void}) {
  const [register,setRegister]=useState(false),[username,setUsername]=useState(''),[displayName,setDisplayName]=useState('');
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:React.FormEvent){e.preventDefault();setError('');if(register&&password!==confirm)return setError('Passwords do not match');setBusy(true);
    try{
      const path=register?'/api/auth/register':'/api/auth/login';
      const body=register?{username:username.trim().replace(/^@/,''),displayName:displayName.trim()||username.trim(),password}:{username:username.trim().replace(/^@/,''),password};
      const r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify(body)});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw Error(d.message||'Authentication failed');
      if(!d.token||!d.user)throw Error('Authentication server returned an invalid session');
      localStorage.setItem('gm_token',d.token);localStorage.setItem('gm_user',JSON.stringify(d.user));onLogin(d.user,d.token);
    }catch(e:any){setError(e.message||'Authentication failed')}finally{setBusy(false)}
  }
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand"><div className="brand-mark"><MessageCircle/></div><div><b>Global Messenger</b><small>Connect · Chat · Share</small></div></div>
    <h1>{register?'Create your account':'Welcome back'}</h1><p>{register?'Create a real Messenger account and start chatting.':'Sign in to your conversations.'}</p>
    {register&&<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Display name" autoComplete="name" />}
    <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
    <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (8+ characters)" type="password" autoComplete={register?'new-password':'current-password'} />
    {register&&<input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" type="password" autoComplete="new-password" />}
    {error&&<div className="error">{error}</div>}
    <button className="primary big" disabled={busy}>{busy?<span>Working…</span>:register?<><UserPlus/> Create account</>:<><LogIn/> Login</>}</button>
    <button type="button" className="link-button" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Login':'New here? Create an account'}</button>
    <div className="security-note"><ShieldCheck/> Your conversations are stored in your Messenger account and synced across signed-in devices.</div>
  </form></div>
}

function App(){
  const [user,setUser]=useState<User|null>(null),[chats,setChats]=useState<Chat[]>([]),[active,setActive]=useState<Chat|null>(null);
  const [messages,setMessages]=useState<Message[]>([]),[query,setQuery]=useState(''),[people,setPeople]=useState<User[]>([]);
  const [text,setText]=useState(''),[folder,setFolder]=useState<Folder>('all'),[socket,setSocket]=useState<Socket|null>(null);
  const [error,setError]=useState(''),[typing,setTyping]=useState(false),[mobile,setMobile]=useState(false);
  const [groupOpen,setGroupOpen]=useState(false),[groupTitle,setGroupTitle]=useState(''),[groupUsers,setGroupUsers]=useState<User[]>([]);
  const [menu,setMenu]=useState(false),[profileOpen,setProfileOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
  const [emoji,setEmoji]=useState(false),[reaction,setReaction]=useState<string|null>(null),[reply,setReply]=useState<Message|null>(null);
  const [editing,setEditing]=useState<Message|null>(null),[presence,setPresence]=useState<Record<string,boolean>>({});
  const fileRef=useRef<HTMLInputElement>(null),typingTimer=useRef<number | undefined>(undefined);

  useEffect(()=>{const t=localStorage.getItem('gm_token'),u=localStorage.getItem('gm_user');if(t&&u){try{setUser(JSON.parse(u));}catch{localStorage.clear()}}},[]);
  useEffect(()=>{if(!user)return; let alive=true;
    api.conversations().then((d:any)=>alive&&setChats(Array.isArray(d)?d.map(normalizeChat):[])).catch(e=>setError(e.message));
    const s=io(API,{auth:{token:localStorage.getItem('gm_token')},transports:['websocket','polling'],reconnection:true});
    s.on('connect',()=>setError(''));s.on('connect_error',(e:any)=>setError(e.message||'Realtime connection failed'));
    s.on('presence:update',(d:any)=>d?.userId&&setPresence(p=>({...p,[d.userId]:!!d.online})));
    s.on('typing',(d:any)=>d?.userId!==user.id&&setTyping(!!d.typing));
    s.on('message:new',(m:Message)=>{setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m].sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt)));setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[]).filter(x=>x.id!==m.id)].slice(0,1)}:c));});
    s.on('message:updated',(m:Message)=>setMessages(p=>p.map(x=>x.id===m.id?m:x)));
    s.on('message:deleted',(d:any)=>setMessages(p=>p.map(x=>x.id===d.id?{...x,body:'',deletedAt:d.deletedAt}:x)));
    s.on('reaction:update',()=>{if(active)setActive({...active})});
    setSocket(s);return()=>{alive=false;s.disconnect()};
  },[user?.id]);
  useEffect(()=>{if(!active)return;setTyping(false);socket?.emit('conversation:join',active.id);api.messages(active.id,100).then((d:any)=>setMessages(Array.isArray(d)?d:[])).catch(e=>setError(e.message));api.read(active.id).catch(()=>{});setChats(p=>p.map(c=>c.id===active.id?{...c,unreadCount:0}:c));return()=>{socket?.emit('conversation:leave',active.id)}},[active?.id,socket]);

  const visible=useMemo(()=>chats.filter(c=>folder==='all'?!c.archived:folder==='archived'?!!c.archived:folder==='favorites'?!!c.favorite:folder==='groups'?c.isGroup:(c.unreadCount||0)>0).filter(c=>{const n=nameOf(c,user?.id||'').toLowerCase();return !query||n.includes(query.toLowerCase())}),[chats,folder,query,user?.id]);
  const activeOther=active?.members.find(m=>m.user.id!==user?.id)?.user;
  async function search(q:string){setQuery(q);if(q.trim().length<2)return setPeople([]);try{setPeople((await api.searchUsers(q)).filter((u:User)=>u.id!==user?.id))}catch(e:any){setError(e.message)}}
  async function openDirect(u:User){try{const c=normalizeChat(await api.direct(u.id));setChats(p=>[c,...p.filter(x=>x.id!==c.id)]);setActive(c);setPeople([]);setQuery('');setMobile(true)}catch(e:any){setError(e.message)}}
  async function createGroup(){if(!groupTitle.trim()||!groupUsers.length)return;try{const c=normalizeChat(await api.group(groupTitle.trim(),groupUsers.map(u=>u.id)));setChats(p=>[c,...p.filter(x=>x.id!==c.id)]);setActive(c);setGroupOpen(false);setGroupTitle('');setGroupUsers([]);setMobile(true)}catch(e:any){setError(e.message)}}
  function send(){const body=text.trim();if(!body||!active)return;if(editing){api.editMessage(editing.id,body).catch(e=>setError(e.message));setEditing(null);setText('');return}if(!socket?.connected)return setError('Realtime connection is offline. Reconnecting…');socket.emit('message:send',{conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});setText('');setReply(null);setEmoji(false)}
  async function sendFile(f:File){if(!active)return;try{const u=await api.upload(f);socket?.emit('message:send',{conversationId:active.id,body:f.type.startsWith('image/')?'Image':f.name,type:'file',attachmentUrl:u.url,attachmentName:u.name||f.name,attachmentMime:f.type,attachmentSize:f.size,clientId:crypto.randomUUID()})}catch(e:any){setError(e.message)}}
  async function organize(kind:'favorite'|'archived',value:boolean){if(!active)return;try{await api.organization(active.id,{[kind]:value});setChats(p=>p.map(c=>c.id===active.id?{...c,[kind==='favorite'?'favorite':'archived']:value}:c));setActive(c=>c?{...c,[kind==='favorite'?'favorite':'archived']:value}:c);setMenu(false)}catch(e:any){setError(e.message)}}
  async function logout(){try{await api.logout()}catch{}localStorage.removeItem('gm_token');localStorage.removeItem('gm_user');socket?.disconnect();setSocket(null);setUser(null);setChats([]);setActive(null);setMessages([])}
  async function react(m:Message,e:string){try{await api.react(m.id,e);setReaction(null)}catch(err:any){setError(err.message)}}
  async function del(m:Message){try{await api.deleteMessage(m.id);setMenu(false)}catch(e:any){setError(e.message)}}

  if(!user)return <Auth onLogin={(u)=>setUser(u)}/>;
  const activeMessages=messages.filter(m=>m.conversationId===active?.id);
  return <div className={'messenger '+(mobile?'mobile-open':'')}>
    <aside className="rail"><div className="rail-avatar"><Avatar user={user} size="lg"/></div>
      <nav><button className="active"><MessageCircle/><span>Chats</span></button><button onClick={()=>setGroupOpen(true)}><Users/><span>Groups</span></button><button onClick={()=>setFolder('favorites')}><Star/><span>Favorites</span></button><button onClick={()=>setFolder('archived')}><Archive/><span>Archive</span></button></nav>
      <div className="rail-bottom"><button onClick={()=>setSettingsOpen(true)}><Settings/></button><button onClick={logout}><LogOut/></button></div>
    </aside>
    <section className="chat-list-pane">
      <header className="list-header"><div className="brand"><div className="brand-mark"><MessageCircle/></div><div><b>Global Messenger</b><small>{socket?.connected?'Connected':'Connecting…'}</small></div></div><button onClick={()=>setSettingsOpen(true)}><Settings/></button></header>
      <div className="me-row"><Avatar user={user}/><div><b>{user.displayName}</b><small>@{user.username}</small></div><button onClick={()=>setProfileOpen(true)}><MoreVertical/></button></div>
      <div className="search"><Search/><input value={query} onChange={e=>search(e.target.value)} placeholder="Search people or chats…"/></div>
      {people.length>0&&<div className="people"><b>People</b>{people.map(p=><button key={p.id} onClick={()=>openDirect(p)}><Avatar user={p}/><span><strong>{p.displayName}</strong><small>@{p.username}</small></span><Plus/></button>)}</div>}
      <div className="folders">{(['all','unread','groups','favorites','archived'] as Folder[]).map(f=><button key={f} className={folder===f?'selected':''} onClick={()=>setFolder(f)}>{f==='all'?'All':f[0].toUpperCase()+f.slice(1)}</button>)}</div>
      <div className="chat-list">{visible.map(c=>{const other=c.members.find(m=>m.user.id!==user.id)?.user;const latest=c.messages?.[0];return <button key={c.id} className={'chat '+(active?.id===c.id?'selected':'')} onClick={()=>{setActive(c);setMobile(true)}}><Avatar user={other} name={nameOf(c,user.id)}/><div><div><strong>{nameOf(c,user.id)}</strong><time>{time(latest?.createdAt)}</time></div><p>{latest?.type==='file'?'📎 '+(latest.attachmentName||'File'):latest?.body||'Start a conversation'}</p></div>{c.favorite&&<Star className="star"/>}{(c.unreadCount||0)>0&&<i className="unread"/>}</button>})}{!visible.length&&<div className="empty-list"><MessageCircle/><b>No chats here</b><span>Search for a person to start a conversation.</span></div>}</div>
      <div className="new-actions"><button onClick={()=>document.querySelector<HTMLInputElement>('.search input')?.focus()}><Plus/> New chat</button><button onClick={()=>setGroupOpen(true)}><Users/> New group</button></div>
    </section>
    <main className="conversation">
      {!active?<div className="welcome"><MessageCircle/><h1>Your messages</h1><p>Private and group conversations in one place.</p><div><button className="primary" onClick={()=>document.querySelector<HTMLInputElement>('.search input')?.focus()}><Search/> Find people</button><button onClick={()=>setGroupOpen(true)}><Users/> Create group</button></div></div>:
      <><header className="conversation-head"><button className="back" onClick={()=>setMobile(false)}><ChevronLeft/></button><Avatar user={activeOther} name={nameOf(active,user.id)}/><div><b>{nameOf(active,user.id)}</b><small>{active.isGroup?active.members.length+' members':activeOther&&presence[activeOther.id]?'Online':'Offline'}</small></div><span className="head-actions"><button onClick={()=>setMenu(!menu)}><MoreVertical/></button></span></header>
      {menu&&<div className="chat-menu"><button onClick={()=>organize('favorite',!active.favorite)}><Star/> {active.favorite?'Remove favorite':'Add to favorites'}</button><button onClick={()=>organize('archived',!active.archived)}><Archive/> {active.archived?'Unarchive chat':'Archive chat'}</button><button onClick={()=>navigator.clipboard?.writeText(location.href)}><Copy/> Copy chat link</button></div>}
      <div className="messages">{activeMessages.length===0?<div className="empty-conversation"><MessageCircle/><span>No messages yet. Say hello!</span></div>:activeMessages.map(m=><Bubble key={m.id} m={m} own={m.senderId===user.id} onReply={()=>setReply(m)} onEdit={()=>{setEditing(m);setText(m.body)}} onDelete={()=>del(m)} reaction={reaction===m.id} onReact={()=>setReaction(reaction===m.id?null:m.id)} onEmoji={e=>react(m,e)}/>)}</div>
      <div className="composer-area">{reply&&<div className="context">Replying to {reply.sender?.displayName||'message'}<button onClick={()=>setReply(null)}><X/></button></div>}{editing&&<div className="context">Editing message<button onClick={()=>{setEditing(null);setText('')}}><X/></button></div>}
        <div className="composer"><input ref={fileRef} hidden type="file" onChange={e=>e.target.files?.[0]&&sendFile(e.target.files[0])}/><button onClick={()=>fileRef.current?.click()}><Paperclip/></button><button onClick={()=>setEmoji(!emoji)}><Smile/></button><input value={text} onChange={e=>{setText(e.target.value);if(socket?.connected){socket.emit('typing',{conversationId:active.id,typing:!!e.target.value.trim()});window.clearTimeout(typingTimer.current);typingTimer.current=window.setTimeout(()=>socket.emit('typing',{conversationId:active.id,typing:false}),1000)}}} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Type a message…"/><button className="send" onClick={send}><Send/></button></div>
        {emoji&&<div className="emoji">{['😀','😂','😍','😊','😎','👍','❤️','🔥','🎉','👏','🙏','💯','✨','🚀','🤣','😮'].map(e=><button key={e} onClick={()=>{setText(t=>t+e);setEmoji(false)}}>{e}</button>)}</div>}
        {typing&&<small className="typing">Someone is typing…</small>}{error&&<div className="error inline">{error}<button onClick={()=>setError('')}><X/></button></div>}
      </div></>}
    </main>
    {profileOpen&&<Modal title="My profile" onClose={()=>setProfileOpen(false)}><Avatar user={user} size="xl"/><h2>{user.displayName}</h2><p>@{user.username}</p><button className="primary" onClick={logout}><LogOut/> Logout</button></Modal>}
    {settingsOpen&&<Modal title="Settings" onClose={()=>setSettingsOpen(false)}><div className="setting"><Bell/><div><b>Notifications</b><small>Realtime message notifications are enabled when supported.</small></div></div><div className="setting"><ShieldCheck/><div><b>Account security</b><small>Use a strong password and sign out of shared devices.</small></div></div><button className="danger big" onClick={logout}><LogOut/> Log out</button></Modal>}
    {groupOpen&&<GroupModal title={groupTitle} setTitle={setGroupTitle} users={groupUsers} setUsers={setGroupUsers} onCreate={createGroup} onClose={()=>setGroupOpen(false)}/>}
  </div>
}

function Bubble({m,own,onReply,onEdit,onDelete,reaction,onReact,onEmoji}:{m:Message;own:boolean;onReply:()=>void;onEdit:()=>void;onDelete:()=>void;reaction:boolean;onReact:()=>void;onEmoji:(e:string)=>void}){
  return <div className={'bubble-row '+(own?'own':'')}><div className="bubble">{m.deletedAt?<i>Message deleted</i>:m.attachmentUrl?<>{m.attachmentMime?.startsWith('image/')?<img src={m.attachmentUrl} alt={m.attachmentName||'image'}/>:<a href={m.attachmentUrl} target="_blank" rel="noreferrer"><Paperclip/> {m.attachmentName||'Download file'}</a>}{m.body!=='Image'&&<p>{m.body}</p>}</>:<p>{m.body}</p>}<small>{time(m.createdAt)} {own&&<CheckCheck/>}</small><button className="bubble-more" onClick={onReact}><Heart/></button>{reaction&&<div className="reaction">{['❤️','👍','😂','😮','😢','🔥'].map(e=><button key={e} onClick={()=>onEmoji(e)}>{e}</button>)}</div>}<div className="bubble-actions"><button onClick={onReply}>Reply</button>{own&&<><button onClick={onEdit}>Edit</button><button onClick={onDelete}>Delete</button></>}</div></div></div>
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop"><div className="modal"><header><b>{title}</b><button onClick={onClose}><X/></button></header><div className="modal-body">{children}</div></div></div>}

function GroupModal({title,setTitle,users,setUsers,onCreate,onClose}:{title:string;setTitle:(v:string)=>void;users:User[];setUsers:(v:User[])=>void;onCreate:()=>void;onClose:()=>void}){
 const [q,setQ]=useState(''),[found,setFound]=useState<User[]>([]);
 async function search(){if(q.trim().length<2)return;try{setFound(await api.searchUsers(q))}catch{}}
 return <div className="modal-backdrop"><div className="modal"><header><b>Create group</b><button onClick={onClose}><X/></button></header><div className="modal-body"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Group name"/><div className="group-search"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search people"/><button onClick={search}><Search/></button></div><div className="selected-users">{users.map(u=><button key={u.id} onClick={()=>setUsers(users.filter(x=>x.id!==u.id))}><Avatar user={u} size="sm"/>{u.displayName}<X/></button>)}</div><div className="results">{found.map(u=><button key={u.id} onClick={()=>{if(!users.some(x=>x.id===u.id))setUsers([...users,u])}}><Avatar user={u} size="sm"/><span>{u.displayName}<small>@{u.username}</small></span><Plus/></button>)}</div><button className="primary big" disabled={!title.trim()||!users.length} onClick={onCreate}><Users/> Create group</button></div></div></div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
