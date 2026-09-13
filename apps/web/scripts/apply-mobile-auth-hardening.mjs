import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mainFile = path.resolve(root, 'src/main.tsx');
if (!fs.existsSync(mainFile)) throw new Error('Mobile auth hardening: src/main.tsx not found');

let source = fs.readFileSync(mainFile, 'utf8');

// Keep mobile authentication on the same API selection used by the rest of the app.
// Native builds can set VITE_API_URL at build time; if omitted, the login screen lets
// the user enter the public HTTPS Docker URL and persists it as gm_api_url.
if (!source.includes('gm-mobile-auth-v2')) {
  const start = source.indexOf('function Auth(');
  const end = source.indexOf('\n\ncreateRoot', start);
  if (start < 0 || end < 0) throw new Error('Mobile auth hardening: Auth/render anchors not found');

  const auth = `function Auth({register,setRegister,username,setUsername,password,setPassword,displayName,setDisplayName,error,setError}:{register:boolean;setRegister:(v:boolean)=>void;username:string;setUsername:(v:string)=>void;password:string;setPassword:(v:string)=>void;displayName:string;setDisplayName:(v:string)=>void;error:string;setError:(v:string)=>void}){
  const [email,setEmail]=useState(''),[confirm,setConfirm]=useState(''),[loading,setLoading]=useState(false);
  const [serverUrl,setServerUrl]=useState(()=>localStorage.getItem('gm_api_url')||'');
  const [showServer,setShowServer]=useState(()=>Boolean((window as any).Capacitor?.isNativePlatform?.()) && !((window as any).__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL));
  const native=Boolean((window as any).Capacitor?.isNativePlatform?.()) || ['capacitor:','ionic:','file:','null:'].includes(window.location.protocol);
  const configured=(window as any).__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || localStorage.getItem('gm_api_url') || (!native?window.location.origin:'');
  const normalized=(value:string)=>value.trim().replace(/\\/$/,'');
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setLoading(true);
    try{
      const base=normalized(showServer?serverUrl:configured);
      if(!base) throw Error('Enter your public HTTPS server URL first.');
      if(native && !/^https:\\/\\//i.test(base)) throw Error('Mobile app requires a public HTTPS server URL.');
      if(/https?:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/i.test(base)) throw Error('Do not use localhost or 127.0.0.1 from a mobile device.');
      if(showServer){localStorage.setItem('gm_api_url',base);setServerUrl(base)}
      const health=await fetch(base+'/health',{method:'GET',cache:'no-store'});
      if(!health.ok) throw Error('Server health check failed ('+health.status+').');
      const url=base+(register?'/api/auth/register-email':'/api/auth/login-email');
      const body=register?{username,displayName:displayName||username,email,password}:{identifier:username,password};
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      let d:any={};try{d=await r.json()}catch{}
      if(!r.ok) throw Error(d?.message||d?.error||'Authentication failed ('+r.status+')');
      if(!d?.token||!d?.user) throw Error('Authentication succeeded but returned an invalid session.');
      localStorage.setItem('gm_token',d.token);localStorage.setItem('gm_user',JSON.stringify(d.user));localStorage.setItem('gm_api_url',base);location.href='/';
    }catch(e:any){setError(e?.message||'Unable to sign in. Check your server URL and network connection.')}finally{setLoading(false)}
  }
  const onServer=(value:string)=>{setServerUrl(value);localStorage.setItem('gm_api_url',normalized(value))};
  return <div className="auth-page"><div className="auth-card">
    <div className="auth-logo"><Globe2/></div><h1>Global <span>Messenger</span></h1><p className="auth-sub">Connect · Chat · Share · Across the World</p>
    <div className="auth-title"><h2>{register?'Create your account':'Welcome back'}</h2><span>{register?'Create a secure Global Messenger account.':'Sign in to continue your conversations.'}</span></div>
    <form onSubmit={submit} autoComplete="on">
      {register&&<><label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" placeholder="Your name" required/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required/></label></>}
      <label>{register?'Username or phone':'Email, username or phone'}<input value={username} onChange={e=>setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder={register?'Choose a username':'Enter your login'} required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?'new-password':'current-password'} placeholder="Your password" required/></label>
      {register&&<label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat your password" required/></label>}
      {native&&<div className="server-config"><button type="button" className="server-toggle" onClick={()=>setShowServer(v=>!v)}>{showServer?'Hide server settings':'⚙ Server / Docker URL'}</button>{showServer&&<input value={serverUrl} onChange={e=>onServer(e.target.value)} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://your-public-docker-domain"/>}<small>Mobile builds cannot reach a Docker service through phone localhost. Use the public HTTPS address.</small></div>}
      {error&&<div className="auth-error" role="alert">{error}</div>}
      <button className="auth-submit" disabled={loading}>{loading?'Connecting…':register?'Create account':'Sign in'}</button>
    </form>
    <button className="auth-switch" type="button" onClick={()=>{setError('');setRegister(!register)}}>{register?'Already have an account? Sign in':'New to Global Messenger? Create an account'}</button>
  </div></div>;
}

`;
  source = source.slice(0,start) + '// gm-mobile-auth-v2\n' + auth + source.slice(end);
  fs.writeFileSync(mainFile,source);
}

console.log('Mobile auth hardening patch applied');
