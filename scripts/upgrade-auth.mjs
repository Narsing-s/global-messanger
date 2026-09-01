import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const advancedPath = path.join(root, 'apps/server/src/advanced.ts');
const mainPath = path.join(root, 'apps/web/src/main.tsx');
const stylesPath = path.join(root, 'apps/web/src/styles.css');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, value) { fs.writeFileSync(file, value, 'utf8'); }

let advanced = read(advancedPath);
if (!advanced.includes("'/api/auth/register-email'")) {
  const marker = "  const auth = { preHandler: [app.authenticate] };";
  const routes = `

  /* Email-first registration/login. Password recovery routes above use the same email field. */
  app.post('/api/auth/register-email', async (request, reply) => {
    const parsed = z.object({
      username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
      displayName: z.string().trim().min(1).max(60),
      email: z.string().trim().email().max(320),
      password: z.string().min(8).max(128)
    }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Username, display name, valid email and password of at least 8 characters are required');

    const username = parsed.data.username.toLowerCase();
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { username: true, email: true } });
    if (existing?.username === username) return reply.conflict('Username is already taken');
    if (existing?.email === email) return reply.conflict('Email is already registered');

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({ data: { username, displayName: parsed.data.displayName, email, passwordHash } });
    const token = app.jwt.sign({ id: user.id, username: user.username });
    return reply.code(201).send({ token, user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } });
  });

  app.post('/api/auth/login-email', async (request, reply) => {
    const parsed = z.object({ identifier: z.string().trim().min(1).max(320), password: z.string().min(1).max(128) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.badRequest('Username/email and password are required');
    const identifier = parsed.data.identifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return reply.unauthorized('Invalid username/email or password');
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const token = app.jwt.sign({ id: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  });`;
  if (!advanced.includes(marker)) throw new Error('Could not find advanced auth registration marker');
  advanced = advanced.replace(marker, marker + routes);
  write(advancedPath, advanced);
}

let main = read(mainPath);
const start = main.indexOf('function Auth(p:any){');
const end = main.indexOf('createRoot(', start);
if (start < 0 || end < 0) throw new Error('Could not locate Auth component in main.tsx');

const auth = `function Auth(p:any){
  const[mode,setMode]=useState<'login'|'register'|'forgot'|'reset'>(()=>new URLSearchParams(location.search).has('resetToken')?'reset':p.register?'register':'login');
  const[identifier,setIdentifier]=useState(''),[email,setEmail]=useState(''),[displayName,setDisplayName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const resetToken=new URLSearchParams(location.search).get('resetToken')||'';
  async function submit(e:any){e.preventDefault();setError('');setMessage('');setLoading(true);try{
    if(mode==='register'){
      if(password!==confirm)throw Error('Passwords do not match');
      const r=await fetch(\`${API}/api/auth/register-email\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:identifier,displayName:displayName||identifier,email,password})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to create account');localStorage.setItem('gm_token',d.token);localStorage.setItem('gm_user',JSON.stringify(d.user));location.href='/';return;
    }
    if(mode==='login'){
      const r=await fetch(\`${API}/api/auth/login-email\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to sign in');localStorage.setItem('gm_token',d.token);localStorage.setItem('gm_user',JSON.stringify(d.user));location.href='/';return;
    }
    if(mode==='forgot'){
      const r=await fetch(\`${API}/api/auth/forgot-password\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to send reset link');setMessage(d.message||'If an account exists for that email, a reset link has been sent.');return;
    }
    if(password!==confirm)throw Error('Passwords do not match');
    const r=await fetch(\`${API}/api/auth/reset-password\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:resetToken,password})});
    const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to reset password');setMessage(d.message||'Password reset successfully.');history.replaceState({},'',location.pathname);setMode('login');setPassword('');setConfirm('');
  }catch(x:any){setError(x.message||'Something went wrong')}finally{setLoading(false)}}
  if(mode==='reset')return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><KeyRound size={27}/></div><h1>Reset your password</h1><p>Choose a new password for your Global Messenger account.</p><form onSubmit={submit}><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="At least 8 characters"/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Repeat your password"/></label>{error&&<div className="error">{error}</div>}{message&&<div className="auth-success">{message}</div>}<button className="primary" disabled={loading}>{loading?'Resetting…':'Reset password'}</button></form>{message&&<button className="switch" onClick={()=>setMode('login')}>Back to sign in</button>}</div></div>;
  if(mode==='forgot')return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><KeyRound size={27}/></div><h1>Forgot password?</h1><p>Enter the email linked to your account. We will send a secure reset link.</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>{error&&<div className="error">{error}</div>}{message&&<div className="auth-success">{message}</div>}<button className="primary" disabled={loading}>{loading?'Sending…':'Send reset link'}</button></form><button className="switch" onClick={()=>{setMode('login');setError('');setMessage('')}}>← Back to sign in</button></div></div>;
  const registering=mode==='register';
  return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><Globe2 size={27}/></div><h1>{registering?'Create your account':'Welcome back'}</h1><p>{registering?'Join conversations securely with email recovery.':'Connect with the world, instantly.'}</p><form onSubmit={submit}>{registering&&<label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" required autoComplete="name"/></label>}<label>{registering?'Username':'Username or email'}<input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={registering?'your_username':'you@example.com or username'} required autoComplete={registering?'username':'username'}/></label>{registering&&<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>}<label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete={registering?'new-password':'current-password'}/></label>{registering&&<label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" required minLength={8} autoComplete="new-password"/></label>}{error&&<div className="error">{error}</div>}{message&&<div className="auth-success">{message}</div>}<button className="primary" disabled={loading}>{loading?(registering?'Creating…':'Signing in…'):(registering?'Create account':'Sign in')}</button></form>{!registering&&<button className="switch" onClick={()=>{setMode('forgot');setError('');setMessage('')}}>Forgot password?</button>}<button className="switch" onClick={()=>{setMode(registering?'login':'register');setError('');setMessage('')}}>{registering?'Already have an account? Sign in':'New here? Create an account'}</button></div></div>;
}
`;
main = main.slice(0,start) + auth + main.slice(end);
write(mainPath, main);

let styles = read(stylesPath);
if (!styles.includes('.auth-success')) {
  styles += '\n.auth-success{background:#effaf4;color:#16724b;padding:9px 11px;border-radius:9px;font-size:11px}\n';
  write(stylesPath, styles);
}

console.log('Global Messenger email authentication upgrade applied.');
console.log('- Registration requires email');
console.log('- Login accepts username or email');
console.log('- Forgot password sends an email reset link');
console.log('- Reset links expire after 30 minutes and are single-use');
