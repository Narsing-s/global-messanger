const API_URL = (() => {
  const configured = (globalThis as any).__GM_CONFIG__?.API_URL;
  const env = (import.meta as any).env?.VITE_API_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (env) return String(env).replace(/\/$/, '');
  if (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) return window.location.origin;
  return 'https://global-messanger-backend.onrender.com';
})();

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gm_token') : null;
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: options.credentials || 'include' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  return (contentType.includes('application/json') ? response.json() : response.text()) as Promise<T>;
}

async function uploadWithProgress(file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gm_token') : null;
  const form = new FormData();
  form.append('file', file);
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/uploads`);
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100)); };
    xhr.onload = () => { try { const data = xhr.responseText ? JSON.parse(xhr.responseText) : {}; if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data?.message || `Upload failed: ${xhr.status}`)); } catch { reject(new Error(`Upload failed: ${xhr.status}`)); } };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    xhr.send(form);
  });
}

const api = {
  conversations:()=>request('/api/conversations'),
  messages:(conversationId:string,limit=100)=>request(`/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`),
  searchUsers:(q:string)=>request(`/api/users/search?q=${encodeURIComponent(q)}`),
  direct:(userId:string)=>request('/api/conversations/direct',{method:'POST',body:JSON.stringify({userId})}),
  group:(title:string,userIds:string[])=>request('/api/conversations/group',{method:'POST',body:JSON.stringify({title,userIds})}),
  read:(conversationId:string)=>request(`/api/conversations/${encodeURIComponent(conversationId)}/read`,{method:'POST'}),
  organization:(id:string,data:any)=>request(`/api/conversations/${encodeURIComponent(id)}/organization`,{method:'PATCH',body:JSON.stringify(data)}),
  organized:(filter='all')=>request(`/api/conversations/organized?filter=${encodeURIComponent(filter)}`),
  editMessage:(id:string,body:string)=>request(`/api/messages/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({body})}),
  deleteMessage:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}`,{method:'DELETE'}),
  upload:(file:File,onProgress?:any,signal?:AbortSignal)=>uploadWithProgress(file,onProgress,signal),
  react:(id:string,emoji:string)=>request(`/api/messages/${encodeURIComponent(id)}/reactions`,{method:'POST',body:JSON.stringify({emoji})}),
  bookmark:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}/bookmark`,{method:'POST'}),
  unbookmark:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}/bookmark`,{method:'DELETE'}),
  forwardMessage:(messageId:string,conversationId:string)=>request('/api/messages/forward',{method:'POST',body:JSON.stringify({messageId,conversationId})}),
  pin:(conversationId:string,messageId:string)=>request(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/pin`,{method:'POST'}),
  unpin:(conversationId:string,messageId:string)=>request(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/pin`,{method:'DELETE'}),
  unreact:(id:string,emoji:string)=>request(`/api/messages/${encodeURIComponent(id)}/reactions`,{method:'DELETE',body:JSON.stringify({emoji})}),
  media:(conversationId?:string,q?:string,limit=100)=>request(`/api/media?conversationId=${encodeURIComponent(conversationId||'')}&q=${encodeURIComponent(q||'')}&limit=${limit}`),
  logout:()=>request('/api/auth/logout',{method:'POST'})
};
const API = API_URL;
export { request, api, API, API_URL };
