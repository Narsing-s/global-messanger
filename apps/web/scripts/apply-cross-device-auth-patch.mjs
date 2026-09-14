import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('function Auth(');
const end = source.indexOf('\ncreateRoot(', start);
if (start < 0 || end <= start) throw new Error('Auth component boundary not found');

const auth = `function Auth({register,setRegister,username,setUsername,password,setPassword,displayName,setDisplayName,error,setError}:{register:boolean;setRegister:(v:boolean)=>void;username:string;setUsername:(v:string)=>void;password:string;setPassword:(v:string)=>void;displayName:string;setDisplayName:(v:string)=>void;error:string;setError:(v:string)=>void}){
  const [email,setEmail]=useState(''),[phoneNumber,setPhoneNumber]=useState(''),[confirm,setConfirm]=useState(''),[loading,setLoading]=useState(false);
  const BACKUP_API='https://global-messanger-backend.onrender.com';
  const native=['capacitor:','ionic:','file:','null'].includes(window.location.protocol);
  async function requestAuth(base:string,path:string,body:any){
    const cleanBase=base.endsWith('/')?base.slice(0,-1):base;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(cleanBase+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'include',signal:controller.signal});
      const text=await response.text();let data:any={};
      try{data=text?JSON.parse(text):{}}catch{data={message:text}};
      return {response,data};
    }finally{window.clearTimeout(timer)}
  }
  async function finishTwoFactor(base:string,userId:string){
    const code=window.prompt('Two-step verification\\nEnter your 6-digit authenticator code or an unused recovery code:')?.trim()||'';
    if(!code)throw Error('Two-step verification is required.');
    const out=await requestAuth(base,'/api/auth/2fa/verify',{userId,code});
    if(!out.response.ok||!out.data?.token)throw Error(out.data?.message||'Invalid two-step verification code.');
    return out.data;
  }
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setLoading(true);
    try{
      if(register&&password!==confirm)throw Error('Passwords do not match');
      const sameOrigin=!native?window.location.origin:'';
      const bases=[API,sameOrigin,BACKUP_API].filter((v,i,a)=>Boolean(v)&&a.indexOf(v)===i);
      const paths=register?['/api/auth/register-email','/api/auth/register']:['/api/auth/login-email','/api/auth/login'];
      let lastMessage='Authentication server is unavailable. Please try again.';
      let result:any=null;
      let workingBase='';
      for(const base of bases){
        for(const path of paths){
          let body:any;
          if(register){
            body=path.endsWith('/register-email')
              ?{username:username.trim(),displayName:(displayName||username).trim(),email:email.trim(),phoneNumber:phoneNumber.trim(),password}
              :{username:username.trim(),displayName:(displayName||username).trim(),password};
          }else{
            body=path.endsWith('/login-email')?{identifier:username.trim(),password}:{username:username.trim(),password};
          }
          try{
            const out=await requestAuth(base,path,body);
            result=out.data;workingBase=base.replace(/\\/$/,'');
            if(out.response.ok&&result?.token)break;
            if(result?.message)lastMessage=String(result.message);
            if(result?.requiresTwoFactor){
              result=await finishTwoFactor(workingBase,String(result.userId||result.user?.id||''));
              break;
            }
          }catch(err:any){lastMessage=err?.name==='AbortError'?'Authentication server timed out.':(err?.message||lastMessage);}
        }
        if(result?.token)break;
      }
      if(!result?.token)throw Error(lastMessage==='Authentication server is unavailable. Please try again.'?lastMessage:'Login server did not return a login token. All configured authentication servers were checked.');
      localStorage.setItem('gm_token',String(result.token));
      localStorage.setItem('gm_user',JSON.stringify(result.user||{}));
      if(workingBase)localStorage.setItem('gm_api_url',workingBase);
      window.history.replaceState({},'',window.location.pathname);
      location.reload();
    }catch(err:any){setError(err?.message||'Authentication failed')}finally{setLoading(false)}
  }
  return <div className="auth-page"><div className="auth-brand"><div className="brand-mark"><Globe2/></div><div><b>Global <span>Messenger</span></b><small>One Messenger for a Global World</small></div></div><div className="auth-card"><h1>{register?'Create your account':'Welcome back'}</h1><p>{register?'Join Global Messenger and connect without borders.':'Connect with the world, instantly.'}</p><form onSubmit={submit}>{register&&<label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" required/></label>}<label>{register?'Username':'Username, email or phone'}<input value={username} onChange={e=>setUsername(e.target.value)} placeholder={register?'your_username':'you@example.com or username'} required autoComplete="username"/></label>{register&&<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>}{register&&<label>Phone number<input value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} placeholder="+91XXXXXXXXXX" required autoComplete="tel"/></label>}<label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete={register?'new-password':'current-password'}/></label>{register&&<label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" required minLength={8} autoComplete="new-password"/></label>}{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={loading}>{loading?(register?'Creating…':'Signing in…'):(register?'Create account':'Sign in')}</button></form><button className="auth-switch" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Sign in':'New here? Create an account'}</button><small className="auth-service-note">Secure login · Web · Android · iPhone · Desktop</small></div></div>;
}
`;
source=source.slice(0,start)+auth+source.slice(end);
fs.writeFileSync(file,source);
console.log('[Production] cross-device authentication and 2FA flow hardened');
