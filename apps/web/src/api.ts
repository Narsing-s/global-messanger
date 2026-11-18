import { getSupabase, SUPABASE_URL } from './supabase';

export const API = SUPABASE_URL;
const profileCache = new Map<string, any>();
const now = () => new Date().toISOString();
const fail = (error: any): never => { throw new Error(error?.message || 'Supabase request failed'); };
const userShape = (p: any) => ({ id:p.id, username:p.username, displayName:p.display_name, avatarUrl:p.avatar_url, lastSeenAt:p.last_seen_at });
async function currentProfile() {
  const sb = await getSupabase();
  const { data:{ user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error('Please sign in again.');
  if (profileCache.has(user.id)) return profileCache.get(user.id);
  const { data, error:e } = await sb.from('gm_profiles').select('id,auth_user_id,username,display_name,avatar_url,last_seen_at,created_at,updated_at').eq('auth_user_id',user.id).single();
  if (e || !data) fail(e || new Error('Your Messenger profile is not ready yet. Please refresh.'));
  profileCache.set(user.id,data);
  return data;
}
async function profileById(id:string) {
  const sb=await getSupabase();
  const {data,error}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').eq('id',id).maybeSingle();
  if(error)fail(error);
  return data;
}
function messageShape(m:any, sender?:any) {
  const meta=m.metadata||{};
  return { id:m.id, conversationId:m.conversation_id, senderId:m.sender_id, body:m.body, createdAt:m.created_at,
    editedAt:m.edited_at, deletedAt:m.deleted_at, sender:sender?userShape(sender):undefined, type:m.type,
    attachmentUrl:meta.attachmentUrl||null, attachmentName:meta.attachmentName||null,
    attachmentMime:meta.attachmentMime||null, attachmentSize:meta.attachmentSize||null };
}
async function loadConversation(id:string) {
  const sb=await getSupabase(), me=await currentProfile();
  const {data:c,error}=await sb.from('gm_conversations').select('*').eq('id',id).single();
  if(error)fail(error);
  const {data:members,error:meErr}=await sb.from('gm_conversation_members').select('user_id,joined_at,last_read_at').eq('conversation_id',id);
  if(meErr)fail(meErr);
  const ids=(members||[]).map((m:any)=>m.user_id);
  const {data:profiles,error:pErr}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').in('id',ids);
  if(pErr)fail(pErr);
  const {data:prefs}=await sb.from('gm_conversation_preferences').select('*').eq('conversation_id',id).eq('user_id',me.id).maybeSingle();
  const byId=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  return {id:c.id,isGroup:c.is_group,title:c.title,createdAt:c.created_at,updatedAt:c.updated_at,
    favorite:!!prefs?.favorite,archived:!!prefs?.archived,
    members:(members||[]).map((m:any)=>({user:userShape(byId.get(m.user_id)),joinedAt:m.joined_at,lastReadAt:m.last_read_at}))};
}
async function listConversations() {
  const sb=await getSupabase(), me=await currentProfile();
  const {data:members,error}=await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id);
  if(error)fail(error);
  const ids=(members||[]).map((x:any)=>x.conversation_id);
  if(!ids.length)return [];
  const {data:conversations,error:e}=await sb.from('gm_conversations').select('id,updated_at').in('id',ids).order('updated_at',{ascending:false});
  if(e)fail(e);
  const result=await Promise.all((conversations||[]).map((c:any)=>loadConversation(c.id)));
  const {data:prefs}=await sb.from('gm_conversation_preferences').select('conversation_id,favorite,archived').eq('user_id',me.id);
  const prefMap=new Map((prefs||[]).map((x:any)=>[x.conversation_id,x]));
  return result.map((c:any)=>({...c,...(prefMap.get(c.id)||{})}));
}
async function listMessages(conversationId:string,limit=100) {
  const sb=await getSupabase();
  const {data,error}=await sb.from('gm_messages').select('*').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(limit);
  if(error)fail(error);
  const ids=[...new Set((data||[]).map((m:any)=>m.sender_id))];
  const messageIds=(data||[]).map((m:any)=>m.id);
  const {data:profiles}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').in('id',ids);
  const byId=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  const {data:attachments,error:attachmentError}=await sb.from('gm_attachments').select('message_id,bucket_id,object_path,file_name,mime_type,size_bytes').in('message_id',messageIds);
  if(attachmentError)fail(attachmentError);
  const attachmentMap=new Map<string,any>();
  await Promise.all((attachments||[]).map(async (a:any)=>{
    const {data:signed,error:signError}=await sb.storage.from(a.bucket_id).createSignedUrl(a.object_path,3600);
    if(!signError&&signed)attachmentMap.set(a.message_id,{attachmentUrl:signed.signedUrl,attachmentName:a.file_name,attachmentMime:a.mime_type,attachmentSize:a.size_bytes});
  }));
  return (data||[]).map((m:any)=>messageShape({...m,metadata:{...(m.metadata||{}),...(attachmentMap.get(m.id)||{})}},byId.get(m.sender_id)));
}
async function sendMessage(conversationId:string,body:string,extra:any={}) {
  const sb=await getSupabase(),me=await currentProfile();
  const meta=extra.metadata||{};
  const {data,error}=await sb.from('gm_messages').insert({conversation_id:conversationId,sender_id:me.id,body,type:extra.type||'text',metadata:meta}).select('*').single();
  if(error)fail(error);
  if(extra.attachment) {
    const a=extra.attachment;
    const {error:ae}=await sb.from('gm_attachments').insert({conversation_id:conversationId,message_id:data.id,uploader_id:me.id,bucket_id:'gm-chat-media',object_path:a.path,file_name:a.name,mime_type:a.mime,size_bytes:a.size});
    if(ae)fail(ae);
  }
  await sb.from('gm_conversations').update({updated_at:now()}).eq('id',conversationId);
  return messageShape(data,me);
}
async function ensureDirect(userId:string) {
  const sb=await getSupabase(),me=await currentProfile();
  const {data:mine,error}=await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id);
  if(error)fail(error);
  const {data:theirs,error:e}=await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',userId);
  if(e)fail(e);
  const theirsSet=new Set((theirs||[]).map((x:any)=>x.conversation_id));
  const shared=(mine||[]).map((x:any)=>x.conversation_id).filter((id:string)=>theirsSet.has(id));
  if(shared.length){
    const {data:found}=await sb.from('gm_conversations').select('id').in('id',shared).eq('is_group',false).limit(1).maybeSingle();
    if(found)return loadConversation(found.id);
  }
  const {data:c,error:ce}=await sb.from('gm_conversations').insert({is_group:false,creator_id:me.id}).select('id').single();
  if(ce)fail(ce);
  const {error:ie}=await sb.from('gm_conversation_members').insert([{conversation_id:c.id,user_id:me.id},{conversation_id:c.id,user_id:userId}]);
  if(ie)fail(ie);
  return loadConversation(c.id);
}
async function recordLogin(sb:any,profile:any,event:'login'|'logout'|'password_changed'){
  const ua=typeof navigator!=='undefined'?navigator.userAgent.slice(0,500):null;
  const {error}=await sb.from('gm_login_history').insert({user_id:profile.id,event,user_agent:ua});
  if(error)console.warn('Unable to record login history',error.message);
  if(event==='login'){
    const {error:deviceError}=await sb.from('gm_user_devices').upsert({user_id:profile.id,device_name:'browser',platform:'web',trusted:true,last_seen_at:now()},{onConflict:'user_id,device_name'});
    if(deviceError)console.warn('Unable to refresh device record',deviceError.message);
  }
}
export const auth = {
  async register(input:{username:string;displayName:string;email:string;password:string}) {
    const sb=await getSupabase();
    const {data,error}=await sb.auth.signUp({email:input.email,password:input.password,options:{data:{app:'global-messenger',username:input.username,display_name:input.displayName}}});
    if(error)fail(error);
    if(!data.session)return {confirmationRequired:true};
    profileCache.delete(data.user?.id||'');
    const p=await currentProfile();
    await recordLogin(sb,p,'login');
    return {token:data.session.access_token,user:userShape(p)};
  },
  async login(email:string,password:string) {
    const sb=await getSupabase();
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error)fail(error);
    profileCache.delete(data.user.id);
    const p=await currentProfile();
    await recordLogin(sb,p,'login');
    return {token:data.session.access_token,user:userShape(p)};
  },
  async logout(){const sb=await getSupabase();try{const p=await currentProfile();await recordLogin(sb,p,'logout')}catch{}profileCache.clear();const {error}=await sb.auth.signOut();if(error)fail(error);}
};
export async function request<T=any>(path:string,options:RequestInit={}):Promise<T>{
  const method=(options.method||'GET').toUpperCase();
  let body:any={};try{body=typeof options.body==='string'?JSON.parse(options.body):options.body||{}}catch{}
  const {securityApi,profileApi,organizationApi,messagingApi,aiApi,supportApi,entitiesApi,notificationsApi}=await import('./services/advanced-api');
  if(path==='/api/conversations'&&method==='GET')return await api.conversations() as T;
  if(path==='/api/messages/bulk-delete'&&method==='POST')return await api.bulkDelete(body.messageIds||[]) as T;
  if(path==='/api/messages/bulk-forward'&&method==='POST')return await messagingApi.bulkForward(body.messageIds||[],body.conversationId) as T;
  if(path==='/api/bookmarks'&&method==='GET')return await api.bookmarks() as T;
  if(path==='/api/notifications'||path==='/api/notifications/center')return await notificationsApi.list() as T;
  if(path==='/api/notifications/center/read'&&method==='POST')return await notificationsApi.markRead() as T;
  if(path==='/api/notifications/preferences'||(path==='/api/privacy/settings'&&method==='GET'))return await profileApi.privacy() as T;
  if(path==='/api/privacy/settings'&&method==='PATCH')return await profileApi.updatePrivacy(body) as T;
  if(path==='/api/account/sessions'&&method==='GET')return await securityApi.devices() as T;
  if(path==='/api/security/login-history')return await securityApi.loginHistory() as T;
  if(path==='/api/security/status')return await securityApi.securityStatus() as T;
  if(path==='/api/security/2fa/status')return await securityApi.twoFactorStatus() as T;
  if(path==='/api/security/2fa/setup'&&method==='POST')return await securityApi.setupTwoFactor() as T;
  if(path==='/api/security/2fa/verify'&&method==='POST')return await securityApi.verifyTwoFactor(body.code,body.factorId) as T;
  if(path==='/api/security/2fa/enable'&&method==='POST')return await securityApi.enableTwoFactor(body.secret,body.code) as T;
  if(path==='/api/security/2fa/disable'&&method==='POST')return await securityApi.disableTwoFactor(body.code) as T;
  if(path==='/api/product/features')return {features:{messaging:true,groups:true,media:true,realtime:true,e2ee:true,support:true,scheduledMessages:true,notifications:true}} as T;
  if(path==='/api/account/export')return await exportAccountData() as T;
  if(path==='/api/media/export')return await api.media(undefined,undefined,1000) as T;
  if(path==='/api/reports'&&method==='POST')return await createUserReport(body) as T;
  if(path==='/api/global/entities'&&method==='POST')return await entitiesApi.create(String(body.kind||'general'),String(body.title||''),body.payload||{}) as T;
  if(path==='/api/global/entities'&&method==='GET')return await entitiesApi.list() as T;
  if(path==='/api/support/tickets'&&method==='POST')return await supportApi.create(String(body.subject||''),String(body.category||'general'),String(body.description||'')) as T;
  if(path==='/api/support/tickets'&&method==='GET')return await supportApi.list() as T;
  const mute=path.match(/^\\/api\\/conversations\\/([^/]+)\\/mute$/);
  if(mute&&method==='POST')return await api.mute(decodeURIComponent(mute[1]),Number(body.minutes||0)) as T;
  const pins=path.match(/^\\/api\\/conversations\\/([^/]+)\\/pins$/);
  if(pins&&method==='GET')return await api.pins(decodeURIComponent(pins[1])) as T;
  const read=path.match(/^\\/api\\/conversations\\/([^/]+)\\/read$/);
  if(read&&method==='POST'){await api.read(decodeURIComponent(read[1]));return {success:true} as T;}
  const blocked=path.match(/^\\/api\\/users\\/([^/]+)\\/block$/);
  if(blocked&&method==='POST'){await api.blockUser(decodeURIComponent(blocked[1]));return {success:true} as T;}
  if(blocked&&method==='DELETE'){await securityApi.unblock(decodeURIComponent(blocked[1]));return {success:true} as T;}
  const message=path.match(/^\\/api\\/messages\\/([^/]+)$/);
  if(message&&method==='PATCH'){await api.editMessage(decodeURIComponent(message[1]),String(body.body||''));return {success:true} as T;}
  if(path.startsWith('/api/messages/search')){const q=new URLSearchParams(path.split('?')[1]||'').get('q')||'';return await api.searchMessages(q) as T;}
  if(path.startsWith('/api/search/universal')){const q=new URLSearchParams(path.split('?')[1]||'').get('q')||'';return await organizationApi.universalSearch(q) as T;}
  if(path.startsWith('/api/media')){const query=new URLSearchParams(path.split('?')[1]||'');return await api.media(query.get('conversationId')||undefined,query.get('q')||undefined,Number(query.get('limit')||100)) as T;}
  if(path==='/api/ai/assist'||path.startsWith('/api/ai/'))throw new Error('AI is not configured yet. Add an AI provider key to a Supabase Edge Function secret.');
  throw new Error('This operation is not yet available in the Supabase backend: '+method+' '+path);
}
async function exportAccountData(){
 const sb=await getSupabase(),me=await currentProfile();
 const names=['gm_profiles','gm_conversation_members','gm_conversations','gm_messages','gm_bookmarks','gm_pinned_messages','gm_conversation_preferences','gm_user_devices','gm_privacy_settings','gm_notifications'];
 const data:any={exportedAt:now(),profile:userShape(me),tables:{}};
 for(const table of names){const q=table==='gm_profiles'?sb.from(table).select('id,username,display_name,avatar_url,last_seen_at').eq('id',me.id):table==='gm_conversation_members'?sb.from(table).select('*').eq('user_id',me.id):table==='gm_conversations'?sb.from(table).select('*').in('id',(await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id)).data?.map((x:any)=>x.conversation_id)||[]):table==='gm_messages'?sb.from(table).select('*').in('conversation_id',(await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id)).data?.map((x:any)=>x.conversation_id)||[]):sb.from(table).select('*').eq('user_id',me.id);const {data:rows,error}=await q;if(error)fail(error);data.tables[table]=rows||[];}
 return data;
}
async function createUserReport(body:any){
 const sb=await getSupabase(),me=await currentProfile();
 const row:any={reporter_id:me.id,reason:String(body.reason||'other'),details:String(body.description||body.details||'').slice(0,4000)};
 if(body.targetId&&String(body.targetId).includes('-'))row.reported_user_id=body.targetId;
 const {data,error}=await sb.from('gm_user_reports').insert(row).select('*').single();if(error)fail(error);return data;
}
async function uploadWithProgress(file:File,onProgress?:(n:number)=>void,signal?:AbortSignal,conversationId?:string) {
  if(signal?.aborted)throw new DOMException('Upload aborted','AbortError');
  const sb=await getSupabase(),me=await currentProfile();
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const bucket=conversationId?'gm-chat-media':'gm-avatars';
  const path=conversationId?conversationId+'/'+me.id+'/'+crypto.randomUUID()+'-'+safeName:me.id+'/'+crypto.randomUUID()+'-'+safeName;
  const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
  if(error)fail(error);
  onProgress?.(100);
  if(bucket==='gm-avatars'){const {data}=sb.storage.from(bucket).getPublicUrl(path);return {url:data.publicUrl,path,bucket,name:file.name,mime:file.type,size:file.size};}
  const {data:signed,error:se}=await sb.storage.from(bucket).createSignedUrl(path,3600);
  if(se)fail(se);
  return {url:signed.signedUrl,path,bucket,name:file.name,mime:file.type,size:file.size};
}
export const api = {
  conversations:listConversations,
  messages:listMessages,
  async searchUsers(q:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const term=q.trim().replace(/[,%]/g,'');
    if(term.length<2)return [];
    const {data,error}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').neq('id',me.id).or('username.ilike.%'+term+'%,display_name.ilike.%'+term+'%').limit(20);
    if(error)fail(error);
    return (data||[]).map(userShape);
  },
  direct:ensureDirect,
  async group(title:string,userIds:string[]) {
    const sb=await getSupabase(),me=await currentProfile();
    const {data:c,error}=await sb.from('gm_conversations').insert({title,is_group:true,creator_id:me.id}).select('id').single();
    if(error)fail(error);
    const ids=[...new Set([me.id,...userIds])];
    const {error:e}=await sb.from('gm_conversation_members').insert(ids.map(user_id=>({conversation_id:c.id,user_id})));
    if(e)fail(e);
    return loadConversation(c.id);
  },
  async updateProfile(patch:Record<string,unknown>){const sb=await getSupabase(),me=await currentProfile();const {error}=await sb.from('gm_profiles').update(patch).eq('id',me.id);if(error)fail(error);profileCache.delete(me.auth_user_id);},
  async read(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_conversation_members').update({last_read_at:now()}).eq('conversation_id',id).eq('user_id',me.id);
    if(error)fail(error);
  },
  async organization(id:string,data:any) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_conversation_preferences').upsert({conversation_id:id,user_id:me.id,...data,updated_at:now()},{onConflict:'conversation_id,user_id'});
    if(error)fail(error);
  },
  async organized(filter='all'){return (await listConversations()).filter((c:any)=>filter==='archived'?c.archived:filter==='favorites'?c.favorite:true);},
  async editMessage(id:string,body:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_messages').update({body,edited_at:now()}).eq('id',id).eq('sender_id',me.id);
    if(error)fail(error);
  },
  async deleteMessage(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_messages').update({body:'',deleted_at:now()}).eq('id',id).eq('sender_id',me.id);
    if(error)fail(error);
  },
  upload:(file:File,onProgress?:any,signal?:AbortSignal,conversationId?:string)=>uploadWithProgress(file,onProgress,signal,conversationId),
  async sendMessage(id:string,body:string,extra?:any){return sendMessage(id,body,extra);},
  async react(id:string,emoji:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_message_reactions').upsert({message_id:id,user_id:me.id,emoji},{onConflict:'message_id,user_id'});
    if(error)fail(error);
  },
  async unreact(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_message_reactions').delete().eq('message_id',id).eq('user_id',me.id);
    if(error)fail(error);
  },
  async bookmark(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_bookmarks').upsert({message_id:id,user_id:me.id},{onConflict:'user_id,message_id'});
    if(error)fail(error);
  },
  async unbookmark(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_bookmarks').delete().eq('message_id',id).eq('user_id',me.id);
    if(error)fail(error);
  },
  async forwardMessage(messageId:string,conversationId:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {data:m,error}=await sb.from('gm_messages').select('body,type,metadata').eq('id',messageId).single();
    if(error)fail(error);
    return sendMessage(conversationId,m.body,{type:m.type,metadata:{...(m.metadata||{}),forwarded:true}});
  },
  async pin(conversationId:string,messageId:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_pinned_messages').upsert({conversation_id:conversationId,message_id:messageId,user_id:me.id},{onConflict:'conversation_id,message_id,user_id'});
    if(error)fail(error);
  },
  async unpin(conversationId:string,messageId:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {error}=await sb.from('gm_pinned_messages').delete().eq('conversation_id',conversationId).eq('message_id',messageId).eq('user_id',me.id);
    if(error)fail(error);
  },
  async searchMessages(q:string,limit=50){
    const sb=await getSupabase();const term=q.trim();if(term.length<2)return [];
    const {data,error}=await sb.from('gm_messages').select('*').ilike('body','%'+term.replace(/[,%]/g,'')+'%').order('created_at',{ascending:false}).limit(limit);
    if(error)fail(error);const ids=[...new Set((data||[]).map((m:any)=>m.sender_id))];
    const {data:profiles,error:pe}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').in('id',ids);if(pe)fail(pe);
    const map=new Map((profiles||[]).map((p:any)=>[p.id,p]));return (data||[]).map((m:any)=>messageShape(m,map.get(m.sender_id)));
  },
  async bookmarks(){
    const sb=await getSupabase(),me=await currentProfile();const {data,error}=await sb.from('gm_bookmarks').select('message_id,created_at').eq('user_id',me.id).order('created_at',{ascending:false}).limit(100);if(error)fail(error);
    const ids=(data||[]).map((x:any)=>x.message_id);if(!ids.length)return [];
    const {data:messages,error:e}=await sb.from('gm_messages').select('*').in('id',ids);if(e)fail(e);
    const byId=new Map((messages||[]).map((m:any)=>[m.id,m]));return (data||[]).map((x:any)=>({createdAt:x.created_at,message:messageShape(byId.get(x.message_id),undefined)})).filter((x:any)=>x.message);
  },
  async pins(conversationId:string){
    const sb=await getSupabase();const {data,error}=await sb.from('gm_pinned_messages').select('message_id,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:false});if(error)fail(error);
    const ids=(data||[]).map((x:any)=>x.message_id);if(!ids.length)return [];
    const {data:messages,error:e}=await sb.from('gm_messages').select('*').in('id',ids);if(e)fail(e);
    const byId=new Map((messages||[]).map((m:any)=>[m.id,m]));return (data||[]).map((x:any)=>({createdAt:x.created_at,message:messageShape(byId.get(x.message_id),undefined)})).filter((x:any)=>x.message);
  },
  async mute(id:string,minutes:number){
    const sb=await getSupabase(),me=await currentProfile();const muted_until=minutes?new Date(Date.now()+minutes*60000).toISOString():null;
    const {error}=await sb.from('gm_conversation_preferences').upsert({conversation_id:id,user_id:me.id,muted_until,updated_at:now()},{onConflict:'conversation_id,user_id'});if(error)fail(error);
  },
  async blockUser(userId:string){
    const sb=await getSupabase(),me=await currentProfile();const {error}=await sb.from('gm_user_blocks').upsert({blocker_id:me.id,blocked_id:userId},{onConflict:'blocker_id,blocked_id'});if(error)fail(error);
  },
  async bulkDelete(ids:string[]){
    const sb=await getSupabase(),me=await currentProfile();const unique=[...new Set(ids.map(String))];if(!unique.length)return {success:true,deleted:0};
    const {data,error}=await sb.from('gm_messages').update({body:'',deleted_at:now()}).in('id',unique).eq('sender_id',me.id).select('id');if(error)fail(error);return {success:true,deleted:data?.length||0};
  },
  async media(conversationId?:string,q?:string,limit=100) {
    const sb=await getSupabase();
    let query=sb.from('gm_attachments').select('*').order('created_at',{ascending:false}).limit(limit);
    if(conversationId)query=query.eq('conversation_id',conversationId);
    if(q)query=query.ilike('file_name','%'+q+'%');
    const {data,error}=await query;if(error)fail(error);return data||[];
  },
  logout:auth.logout
};
