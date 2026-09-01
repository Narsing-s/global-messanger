import React from 'react';
import { createRoot } from 'react-dom/client';
import { ResetPassword } from './password-reset';
import './styles.css';

const token = new URLSearchParams(window.location.search).get('token') || '';

function App() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        {token ? (
          <ResetPassword token={token} onDone={() => { window.location.href = '/'; }} />
        ) : (
          <div className="auth-form">
            <h2>Invalid reset link</h2>
            <p>This password reset link is missing its security token. Please request a new reset email.</p>
            <button onClick={() => { window.location.href = '/'; }}>Back to login</button>
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
