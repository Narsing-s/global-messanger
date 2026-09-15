import type { ApiResponse } from './types';

const API_URL = (() => {
  const configured = (globalThis as any).__GM_CONFIG__?.API_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
})();

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gm_token') : null;
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
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
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data?.message || `Upload failed: ${xhr.status}`));
      } catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    xhr.send(form);
  });
}

const api = {
  searchMessages:(q:string,conversationId?:string,filters?:{senderId?:string;from?:string;to?:string;type?:string;hasAttachment?:boolean})=>{const params=new URLSearchParams({q});if(conversationId)params.set('conversationId',conversationId);for(const [k,v] of Object.entries(filters||{}))if(v!==undefined&&v!=='')params.set(k,String(v));return request(`/api/messages/search?${params}`);},
  profile:()=>request('/api/profile/me'), updateProfile:(data:any)=>request('/api/profile/me',{method:'PATCH',body:JSON.stringify(data)}), productFeatures:()=>request('/api/product/features'),
  sessions:()=>request('/api/security/sessions'), revokeSession:(id:string)=>request(`/api/security/sessions/${encodeURIComponent(id)}`,{method:'DELETE'}), revokeOtherSessions:()=>request('/api/security/sessions/revoke-others',{method:'POST'}),
  securityStatus:()=>request('/api/security/status'), loginHistory:()=>request('/api/account/login-history'),
  setup2FA:()=>request('/api/security/2fa/setup',{method:'POST'}), verify2FA:(code:string)=>request('/api/security/2fa/verify',{method:'POST',body:JSON.stringify({code})}), disable2FA:(password:string)=>request('/api/security/2fa/disable',{method:'POST',body:JSON.stringify({password})}),
  privacySettings:()=>request('/api/privacy/settings'), updatePrivacySettings:(data:{lastSeen?:'everyone'|'contacts'|'nobody';profilePhoto?:'everyone'|'contacts'|'nobody'})=>request('/api/privacy/settings',{method:'PATCH',body:JSON.stringify(data)}),
  organization:(id:string,data:any)=>request(`/api/conversations/${encodeURIComponent(id)}/organization`,{method:'PATCH',body:JSON.stringify(data)}), organized:(filter='all')=>request(`/api/conversations/organized?filter=${encodeURIComponent(filter)}`),
  media:(conversationId?:string,type?:string,limit=100)=>request(`/api/media?limit=${limit}${conversationId?`&conversationId=${encodeURIComponent(conversationId)}`:''}${type?`&type=${encodeURIComponent(type)}`:''}`), renameGroup:(id:string,title:string)=>request(`/api/conversations/${encodeURIComponent(id)}/group`,{method:'PATCH',body:JSON.stringify({title})}), addGroupMember:(id:string,userId:string)=>request(`/api/conversations/${encodeURIComponent(id)}/members`,{method:'POST',body:JSON.stringify({userId})}), removeGroupMember:(id:string,userId:string)=>request(`/api/conversations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,{method:'DELETE'}),
  forwardMessage:(messageId:string,conversationId:string)=>request('/api/messages/forward',{method:'POST',body:JSON.stringify({messageId,conversationId})}), editMessage:(id:string,body:string)=>request(`/api/messages/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({body})}), deleteMessage:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}`,{method:'DELETE'}), upload:(file:File,onProgress?:any,signal?:AbortSignal)=>uploadWithProgress(file,onProgress,signal), react:(id:string,emoji:string)=>request(`/api/messages/${encodeURIComponent(id)}/reactions`,{method:'POST',body:JSON.stringify({emoji})}), unreact:(id:string,emoji:string)=>request(`/api/messages/${encodeURIComponent(id)}/reactions`,{method:'DELETE',body:JSON.stringify({emoji})}), bookmark:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}/bookmark`,{method:'POST'}), unbookmark:(id:string)=>request(`/api/messages/${encodeURIComponent(id)}/bookmark`,{method:'DELETE'}), registerDevice:(token:string,platform:string)=>request('/api/devices',{method:'POST',body:JSON.stringify({token,platform})}), aiAssist:(prompt:string,context?:string)=>request('/api/ai/assist',{method:'POST',body:JSON.stringify({prompt,context})}), logout:()=>request('/api/auth/logout',{method:'POST'})
};

export { request, api, API_URL };