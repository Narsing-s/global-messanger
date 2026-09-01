import React, { useState } from 'react';

const API = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to send reset link');
      setMessage(d.message);
    } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="auth-form"><h2>Forgot password?</h2><p>Enter the email linked to your Global Messenger account.</p><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" />{error&&<div className="auth-error">{error}</div>}{message&&<div className="auth-success">{message}</div>}<button disabled={loading}>{loading?'Sending…':'Send reset link'}</button><button type="button" className="secondary" onClick={onBack}>Back to login</button></form>;
}

export function ResetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');if(password.length<8)return setError('Password must be at least 8 characters.');if(password!==confirm)return setError('Passwords do not match.');setLoading(true);try{const r=await fetch(`${API}/api/auth/reset-password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to reset password');setMessage(d.message);}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  if(message)return <div className="auth-form"><h2>Password reset complete</h2><div className="auth-success">{message}</div><button onClick={onDone}>Back to login</button></div>;
  return <form onSubmit={submit} className="auth-form"><h2>Create a new password</h2><p>Choose a strong password with at least 8 characters.</p><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password"/><input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password"/>{error&&<div className="auth-error">{error}</div>}<button disabled={loading}>{loading?'Resetting…':'Reset password'}</button></form>;
}
