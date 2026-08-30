import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Search, Settings, Users, Send, Smile, Paperclip, Phone, Video, MoreHorizontal, CheckCheck, Globe2, Sparkles } from 'lucide-react';
import './styles.css';

type User = { id: string; username: string; displayName: string; avatarUrl?: string | null };
type Chat = { id: string; name: string; preview: string; online?: boolean; time: string; color: number };
type Message = { id: string; senderId: string; body: string; createdAt: string };

const seedChats: Chat[] = [
  { id: 'demo-1', name: 'Global Community', preview: 'Welcome to Global Messenger 👋', time: 'Now', online: true, color: 1 },
  { id: 'demo-2', name: 'Design Team', preview: 'The new workspace looks great.', time: '09:42', online: true, color: 2 },
  { id: 'demo-3', name: 'Travel Friends', preview: 'Anyone up for a trip this weekend?', time: 'Yesterday', color: 3 }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [register, setRegister] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(seedChats[0]);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => seedChats.filter(c => c.name.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    const token = localStorage.getItem('gm_token');
    const stored = localStorage.getItem('gm_user');
    if (!token || !stored) return;
    setUser(JSON.parse(stored));
    const s = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4000', { auth: { token } });
    s.on('message:new', (message: Message) => setMessages(prev => [...prev, message]));
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/auth/${register ? 'register' : 'login'}`;
    const body = register ? { username, displayName: displayName || username, password } : { username, password };
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data === 'string' ? data : data.message ?? 'Unable to authenticate');
      localStorage.setItem('gm_token', data.token); localStorage.setItem('gm_user', JSON.stringify(data.user));
      setUser(data.user); window.location.reload();
    } catch (err: any) { setError(err.message); }
  }

  function send() {
    if (!text.trim()) return;
    if (socket?.connected) socket.emit('message:send', { conversationId: active.id, body: text });
    setMessages(prev => [...prev, { id: crypto.randomUUID(), senderId: user?.id ?? 'me', body: text.trim(), createdAt: new Date().toISOString() }]);
    setText('');
  }

  if (!user) return <Auth register={register} setRegister={setRegister} username={username} setUsername={setUsername} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} error={error} onSubmit={authenticate} />;

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Globe2 size={21}/></div><div><b>Global</b><span>Messenger</span></div></div>
      <div className="profile"><div className="avatar big">{user.displayName[0]}</div><div className="profile-text"><b>{user.displayName}</b><span>@{user.username}</span></div><button className="icon-btn"><Settings size={18}/></button></div>
      <div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations" /></div>
      <div className="nav"><button className="active"><MessageCircle size={18}/> Chats <span>3</span></button><button><Users size={18}/> Contacts</button></div>
      <div className="section-title">RECENT CHATS</div>
      <div className="chat-list">{filtered.map(c=><button key={c.id} onClick={()=>setActive(c)} className={`chat-item ${active.id===c.id?'selected':''}`}><div className={`avatar c${c.color}`}>{c.name[0]}</div><div className="chat-copy"><div><b>{c.name}</b><small>{c.time}</small></div><p>{c.preview}</p></div>{c.online&&<i className="online"/>}</button>)}</div>
      <div className="sidebar-bottom"><button><Sparkles size={17}/> Explore features</button></div>
    </aside>
    <main className="conversation">
      <header className="topbar"><div className="chat-heading"><div className="avatar c1">{active.name[0]}</div><div><b>{active.name}</b><span>{active.online ? '● Online' : 'Last seen recently'}</span></div></div><div className="top-actions"><button className="icon-btn"><Phone size={19}/></button><button className="icon-btn"><Video size={20}/></button><button className="icon-btn"><MoreHorizontal size={20}/></button></div></header>
      <div className="messages"><div className="day"><span>Today</span></div>{messages.filter(m=>active.id==='demo-1').map(m=><Bubble key={m.id} message={m} own={m.senderId===user.id} />)}{messages.filter(m=>active.id==='demo-1').length===0&&<div className="welcome"><div className="welcome-icon"><Globe2 size={30}/></div><h2>Welcome to Global Messenger</h2><p>Start a conversation with people anywhere in the world.</p></div>}</div>
      <div className="composer-wrap"><div className="composer"><button className="icon-btn"><Paperclip size={19}/></button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Write a message..."/><button className="icon-btn"><Smile size={20}/></button><button className="send" onClick={send}><Send size={18}/></button></div><small>Messages are delivered in real time • Global Messenger</small></div>
    </main>
  </div>;
}

function Bubble({message, own}:{message:Message; own:boolean}) { return <div className={`bubble-row ${own?'own':''}`}><div className="bubble"><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} {own&&<CheckCheck size={13}/>}</small></div></div>; }

function Auth(p:any) { return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><Globe2 size={27}/></div><h1>{p.register?'Create your account':'Welcome back'}</h1><p>{p.register?'Join conversations without borders.':'Connect with the world, instantly.'}</p><form onSubmit={p.onSubmit}>{p.register&&<label>Display name<input value={p.displayName} onChange={e=>p.setDisplayName(e.target.value)} placeholder="Your name" required /></label>}<label>Username<input value={p.username} onChange={e=>p.setUsername(e.target.value)} placeholder="your_username" required /></label><label>Password<input type="password" value={p.password} onChange={e=>p.setPassword(e.target.value)} placeholder="At least 8 characters" required /></label>{p.error&&<div className="error">{p.error}</div>}<button className="primary">{p.register?'Create account':'Sign in'}</button></form><button className="switch" onClick={()=>p.setRegister(!p.register)}>{p.register?'Already have an account? Sign in':'New here? Create an account'}</button></div></div> }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
