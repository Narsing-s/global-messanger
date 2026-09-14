import fs from 'node:fs';

const file = 'src/main.tsx';
if (!fs.existsSync(file)) throw new Error('Session logout patch: src/main.tsx not found');
let source = fs.readFileSync(file, 'utf8');
const guard = '/* session-logout-v1 */';
if (!source.includes(guard)) {
  const old = "  function logout(){localStorage.clear();socket?.disconnect();setUser(null);setChats([]);setActive(null)}";
  const next = `  async function logout(){${guard} const token=localStorage.getItem('gm_token'); try { if(token) await api.request('/api/auth/logout',{method:'POST'}); } catch {} localStorage.clear();socket?.disconnect();setUser(null);setChats([]);setActive(null)}`;
  if (!source.includes(old)) throw new Error('Session logout patch: logout anchor not found');
  source = source.replace(old, next);
  fs.writeFileSync(file, source);
  console.log('[Production] logout now revokes the server session');
}
