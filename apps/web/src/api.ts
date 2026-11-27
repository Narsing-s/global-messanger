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
  // Ensure the profile exists for both new and previously-created Auth users.
  // The RPC handles the zero-row case safely and returns one profile object.
  const { data, error:e } = await sb.rpc('gm_ensure_current_profile');
  if (e) fail(e);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Your Messenger profile could not be loaded. Please sign in again.');
  }
  profileCache.set(user.id,data);
  return data;
}
const missingSocialRpc=(e:any)=>e?.code==='PGRST202'||e?.code==='42883'||String(e?.message||'').toLowerCase().includes('gm_get_profile_details');
const profileDetailsCache=new Map<string,{expiresAt:number;value:any}>();
const profileDetailsInFlight=new Map<string,Promise<any>>();
async function getProfileDetails(sb:any,id:string){
  const cached=profileDetailsCache.get(id);
  if(cached&&cached.expiresAt>Date.now())return cached.value;
  const pending=profileDetailsInFlight.get(id);
  if(pending)return pending;
  const request=(async()=>{
    const {data,error}=await sb.rpc('gm_get_profile_details',{target_user:id});
    if(!error){
      const value=data||null;
      profileDetailsCache.set(id,{expiresAt:Date.now()+30_000,value});
      return value;
    }
    if(!missingSocialRpc(error))fail(error);
    // Keep the legacy privacy-safe fallback for deployments awaiting the social migration.
    const {data:legacy,error:legacyError}=await sb.from('gm_profiles').select('id,avatar_url,last_seen_at').eq('id',id).maybeSingle();
    if(legacyError)fail(legacyError);
    const {data:visible,error:visibilityError}=await sb.rpc('gm_last_seen_visible',{target_user:id});
    if(visibilityError)fail(visibilityError);
    const value=legacy?{...legacy,last_seen_at:visible===false?null:legacy.last_seen_at}:null;
    profileDetailsCache.set(id,{expiresAt:Date.now()+30_000,value});
    return value;
  })();
  profileDetailsInFlight.set(id,request);
  try{return await request;}finally{profileDetailsInFlight.delete(id);}
}
async function hidePrivateLastSeen(sb:any,profiles:any[]){
  return await Promise.all((profiles||[]).map(async(p:any)=>{
    const details=await getProfileDetails(sb,p.id);
    return details?{...p,...details}:{...p,avatar_url:null,bio:null,last_seen_at:null};
  }));
}
async function profileById(id:string) {
  const sb=await getSupabase();
  const {data,error}=await sb.rpc('gm_get_profile_details',{target_user:id});
  if(!error)return data;
  if(!missingSocialRpc(error))fail(error);
  const {data:legacy,error:legacyError}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').eq('id',id).maybeSingle();
  if(legacyError)fail(legacyError);
  if(!legacy)return null;
  const {data:visible,error:visibilityError}=await sb.rpc('gm_last_seen_visible',{target_user:id});
  if(visibilityError)fail(visibilityError);
  return {...legacy,last_seen_at:visible===false?null:legacy.last_seen_at};
}
function messageShape(m:any, sender?:any) {
  const meta=m.metadata||{};
  return { id:m.id, conversationId:m.conversation_id, senderId:m.sender_id, body:m.body, createdAt:m.created_at,
    editedAt:m.edited_at, deletedAt:m.deleted_at, sender:sender?userShape(sender):undefined, type:m.type,
    storyId:meta.storyId||null, storyBody:meta.storyBody||'', storyMediaType:meta.storyMediaType||null, storyTheme:meta.storyTheme||null,
    attachmentUrl:meta.attachmentUrl||null, attachmentName:meta.attachmentName||null,
    attachmentMime:meta.attachmentMime||null, attachmentSize:meta.attachmentSize||null, replyToId:meta.replyToId||null, reactions:meta.reactions||[] };
}
async function loadConversation(id:string) {
  const sb=await getSupabase(), me=await currentProfile();
  const {data:c,error}=await sb.from('gm_conversations').select('*').eq('id',id).single();
  if(error)fail(error);
  const {data:members,error:meErr}=await sb.from('gm_conversation_members').select('user_id,joined_at,last_read_at').eq('conversation_id',id);
  if(meErr)fail(meErr);
  const ids=(members||[]).map((m:any)=>m.user_id);
  const {data:profiles,error:pErr}=await sb.from('gm_profiles').select('id,username,display_name').in('id',ids);
  if(pErr)fail(pErr);
  const safeProfiles=await hidePrivateLastSeen(sb,profiles||[]);
  const {data:prefs}=await sb.from('gm_conversation_preferences').select('*').eq('conversation_id',id).eq('user_id',me.id).maybeSingle();
  const byId=new Map(safeProfiles.map((p:any)=>[p.id,p]));
  return {id:c.id,isGroup:c.is_group,title:c.title,createdAt:c.created_at,updatedAt:c.updated_at,
    favorite:!!prefs?.favorite,archived:!!prefs?.archived,
    members:(members||[]).map((m:any)=>({user:userShape(byId.get(m.user_id)),joinedAt:m.joined_at,lastReadAt:m.last_read_at}))};
}
async function listConversations() {
  const sb=await getSupabase(), me=await currentProfile();
  const {data:memberships,error}=await sb.from('gm_conversation_members')
    .select('conversation_id,user_id,joined_at,last_read_at').eq('user_id',me.id);
  if(error)fail(error);
  const ids=[...new Set((memberships||[]).map((x:any)=>x.conversation_id))];
  if(!ids.length)return [];
  const [conversationResult,allMembersResult,prefsResult]=await Promise.all([
    sb.from('gm_conversations').select('id,is_group,title,created_at,updated_at').in('id',ids).order('updated_at',{ascending:false}),
    sb.from('gm_conversation_members').select('conversation_id,user_id,joined_at,last_read_at').in('conversation_id',ids),
    sb.from('gm_conversation_preferences').select('conversation_id,favorite,archived').eq('user_id',me.id)
  ]);
  if(conversationResult.error)fail(conversationResult.error);
  if(allMembersResult.error)fail(allMembersResult.error);
  if(prefsResult.error)fail(prefsResult.error);
  const allMembers=allMembersResult.data||[];
  const profileIds=[...new Set(allMembers.map((m:any)=>m.user_id))];
  const {data:profiles,error:profileError}=await sb.from('gm_profiles')
    .select('id,username,display_name').in('id',profileIds);
  if(profileError)fail(profileError);
  const safeProfiles=await hidePrivateLastSeen(sb,profiles||[]);
  const profileById=new Map(safeProfiles.map((p:any)=>[p.id,p]));
  const membersByConversation=new Map<string,any[]>();
  for(const member of allMembers){
    const list=membersByConversation.get(member.conversation_id)||[];
    list.push(member);membersByConversation.set(member.conversation_id,list);
  }
  const prefMap=new Map((prefsResult.data||[]).map((x:any)=>[x.conversation_id,x]));
  // Include the latest message in every inbox row so a newly-created story-reply DM
  // appears immediately for both participants, even before either opens the chat.
  const {data:recentMessages,error:recentError}=await sb.from('gm_messages').select('*').in('conversation_id',ids).order('created_at',{ascending:false}).limit(5000);
  if(recentError)fail(recentError);
  const latestByConversation=new Map<string,any>();
  for(const message of recentMessages||[])if(!latestByConversation.has(message.conversation_id))latestByConversation.set(message.conversation_id,message);
  return (conversationResult.data||[]).map((conversation:any)=>{
    const prefs:any=prefMap.get(conversation.id)||{};
    return {
      id:conversation.id,isGroup:conversation.is_group,title:conversation.title,
      createdAt:conversation.created_at,updatedAt:conversation.updated_at,
      favorite:!!prefs.favorite,archived:!!prefs.archived,
      messages:latestByConversation.has(conversation.id)?[messageShape(latestByConversation.get(conversation.id),profileById.get(latestByConversation.get(conversation.id).sender_id))]:[],
      members:(membersByConversation.get(conversation.id)||[]).map((m:any)=>({
        user:userShape(profileById.get(m.user_id)),joinedAt:m.joined_at,lastReadAt:m.last_read_at
      }))
    };
  });
}
async function listMessages(conversationId:string,limit=100) {
  const sb=await getSupabase();
  const {data,error}=await sb.from('gm_messages').select('*').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(limit);
  if(error)fail(error);
  const ids=[...new Set((data||[]).map((m:any)=>m.sender_id))];
  const messageIds=(data||[]).map((m:any)=>m.id);
  const {data:profiles}=await sb.from('gm_profiles').select('id,username,display_name').in('id',ids);
  const safeProfiles=await hidePrivateLastSeen(sb,profiles||[]);
  const byId=new Map(safeProfiles.map((p:any)=>[p.id,p]));
  const {data:attachments,error:attachmentError}=messageIds.length
    ?await sb.from('gm_attachments').select('message_id,bucket_id,object_path,file_name,mime_type,size_bytes').in('message_id',messageIds)
    :{data:[],error:null};
  if(attachmentError)fail(attachmentError);
  const attachmentMap=new Map<string,any>();
  const buckets=[...new Set((attachments||[]).map((a:any)=>a.bucket_id))];
  await Promise.all(buckets.map(async(bucketId:any)=>{
    const rows=(attachments||[]).filter((a:any)=>a.bucket_id===bucketId);
    const {data:signed,error:signError}=await sb.storage.from(bucketId)
      .createSignedUrls(rows.map((a:any)=>a.object_path),3600);
    if(signError||!signed)return;
    rows.forEach((a:any,index:number)=>{
      const item=signed[index];
      if(item?.signedUrl)attachmentMap.set(a.message_id,{
        attachmentUrl:item.signedUrl,attachmentName:a.file_name,
        attachmentMime:a.mime_type,attachmentSize:a.size_bytes
      });
    });
  }));
  const {data:reactionRows,error:reactionError}=messageIds.length?await sb.from('gm_message_reactions').select('message_id,user_id,emoji').in('message_id',messageIds):{data:[],error:null};
  if(reactionError)fail(reactionError);
  const reactionMap=new Map<string,any[]>();
  for(const row of reactionRows||[]){const list=reactionMap.get(row.message_id)||[];list.push(row);reactionMap.set(row.message_id,list);}
  const me=await currentProfile();
  return (data||[]).map((m:any)=>{const grouped=new Map<string,any>();for(const row of reactionMap.get(m.id)||[]){const item=grouped.get(row.emoji)||{emoji:row.emoji,count:0,reactedByMe:false};item.count++;item.reactedByMe ||= row.user_id===me.id;grouped.set(row.emoji,item);}return messageShape({...m,metadata:{...(m.metadata||{}),...(attachmentMap.get(m.id)||{}),reactions:[...grouped.values()]}},byId.get(m.sender_id));});
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
  // Create/reuse the direct conversation and both memberships atomically.
  // The database function performs the operation with a validated auth.uid(),
  // so RLS cannot leave behind an empty conversation if the second insert fails.
  const {data:conversationId,error}=await sb.rpc('gm_start_direct_conversation',{target_user:userId});
  if(error)fail(error);
  if(!conversationId)throw new Error('The conversation could not be created. Please retry.');
  return loadConversation(conversationId);
}
async function recordLogin(sb:any,profile:any,event:'login'|'logout'|'password_changed'){
  const ua=typeof navigator!=='undefined'?navigator.userAgent.slice(0,500):null;
  const {error}=await sb.from('gm_login_history').insert({user_id:profile.id,event,user_agent:ua});
  if(error)console.warn('Unable to record login history',error.message);
  if(event==='login'){
    let deviceId=localStorage.getItem('gm_device_id');if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem('gm_device_id',deviceId);}
    const deviceName=(navigator.platform||'Browser').slice(0,80);
    const {error:deviceError}=await sb.from('gm_session_devices').upsert({user_id:profile.id,device_id:deviceId,device_name:deviceName,platform:'web',user_agent:ua,last_seen_at:now()},{onConflict:'user_id,device_id'});
    if(deviceError)console.warn('Unable to refresh session device record',deviceError.message);
  }
}
export const auth = {
  async register(input:{username:string;displayName:string;email:string;password:string}) {
    const sb=await getSupabase();
    let data:any;
    const signup=await sb.auth.signUp({email:input.email,password:input.password,options:{data:{app:'global-messenger',username:input.username,display_name:input.displayName}}});
    if(signup.error){
      const message=String(signup.error.message||'').toLowerCase();
      const alreadyRegistered=message.includes('already registered')||message.includes('user already exists')||message.includes('already been registered');
      if(!alreadyRegistered)fail(signup.error);
      // A retry from an existing account should behave like login, not create a duplicate.
      const login=await sb.auth.signInWithPassword({email:input.email,password:input.password});
      if(login.error)throw new Error('An account with this email already exists. Sign in with its password or use password reset.');
      data=login.data;
    }else{
      data=signup.data;
    }
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
  if(path==='/api/product/features')return {features:{messaging:true,groups:true,media:true,realtime:true,e2ee:false,support:true,scheduledMessages:true,notifications:true}} as T;
  if(path==='/api/account/export')return await exportAccountData() as T;
  if(path==='/api/media/export')return await api.media(undefined,undefined,1000) as T;
  if(path==='/api/reports'&&method==='POST')return await createUserReport(body) as T;
  if(path==='/api/global/entities'&&method==='POST')return await entitiesApi.create(String(body.kind||'general'),String(body.title||''),body.payload||{}) as T;
  if(path==='/api/global/entities'&&method==='GET')return await entitiesApi.list() as T;
  if(path==='/api/support/tickets'&&method==='POST')return await supportApi.create(String(body.subject||''),String(body.category||'general'),String(body.description||'')) as T;
  if(path==='/api/support/tickets'&&method==='GET')return await supportApi.list() as T;
  const mute=path.match(/^\/api\/conversations\/([^/]+)\/mute$/);
  if(mute&&method==='POST')return await api.mute(decodeURIComponent(mute[1]),Number(body.minutes||0)) as T;
  const pins=path.match(/^\/api\/conversations\/([^/]+)\/pins$/);
  if(pins&&method==='GET')return await api.pins(decodeURIComponent(pins[1])) as T;
  const read=path.match(/^\/api\/conversations\/([^/]+)\/read$/);
  if(read&&method==='POST'){await api.read(decodeURIComponent(read[1]));return {success:true} as T;}
  const blocked=path.match(/^\/api\/users\/([^/]+)\/block$/);
  if(blocked&&method==='POST'){await api.blockUser(decodeURIComponent(blocked[1]));return {success:true} as T;}
  if(blocked&&method==='DELETE'){await securityApi.unblock(decodeURIComponent(blocked[1]));return {success:true} as T;}
  const message=path.match(/^\/api\/messages\/([^/]+)$/);
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
 for(const table of names){const q=table==='gm_profiles'?sb.from(table).select('id,username,display_name').eq('id',me.id):table==='gm_conversation_members'?sb.from(table).select('*').eq('user_id',me.id):table==='gm_conversations'?sb.from(table).select('*').in('id',(await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id)).data?.map((x:any)=>x.conversation_id)||[]):table==='gm_messages'?sb.from(table).select('*').in('conversation_id',(await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',me.id)).data?.map((x:any)=>x.conversation_id)||[]):sb.from(table).select('*').eq('user_id',me.id);const {data:rows,error}=await q;if(error)fail(error);data.tables[table]=rows||[];}
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
  conversation:loadConversation,
  messages:listMessages,
  async searchUsers(q:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const term=q.trim();
    if(term.length<2)return [];
    // Search through a database RPC so profile discovery is not accidentally
    // hidden by direct-table column grants or row-level security policies.
    // The RPC enforces profile_visibility and symmetric block rules server-side.
    const {data,error}=await sb.rpc('gm_search_profiles',{
      search_term:term,
      result_limit:20
    });
    if(error)fail(error);
    const profiles=await Promise.all((data||[]).filter((p:any)=>p.id!==me.id).map(async(p:any)=>{
      const details=await getProfileDetails(sb,p.id);
      return details?userShape({...p,...details}):null;
    }));
    return profiles.filter(Boolean);
  },
  direct:ensureDirect,
  async group(title:string,userIds:string[]) {
    const sb=await getSupabase();
    // The database validates the authenticated creator, selected profiles and block rules,
    // then creates the group and every membership in one atomic transaction.
    const {data:conversationId,error}=await sb.rpc('gm_create_group_conversation',{
      group_title:title,
      member_users:[...new Set(userIds)]
    });
    if(error)fail(error);
    if(!conversationId)throw new Error('The group could not be created. Please retry.');
    return loadConversation(conversationId);
  },
  async updateProfile(patch:Record<string,unknown>){const sb=await getSupabase(),me=await currentProfile();const {error}=await sb.from('gm_profiles').update(patch).eq('id',me.id);if(error)fail(error);profileCache.delete(me.auth_user_id);},
  async read(id:string) {
    const sb=await getSupabase(),me=await currentProfile();
    const {data:privacy}=await sb.from('gm_privacy_settings').select('read_receipts').eq('user_id',me.id).maybeSingle();
    if(privacy?.read_receipts===false)return;
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
    const {data:profiles,error:pe}=await sb.from('gm_profiles').select('id,username,display_name').in('id',ids);if(pe)fail(pe);
    const safeProfiles=await hidePrivateLastSeen(sb,profiles||[]);const map=new Map(safeProfiles.map((p:any)=>[p.id,p]));return (data||[]).map((m:any)=>messageShape(m,map.get(m.sender_id)));
  },
  async bookmarks(){
    const sb=await getSupabase(),me=await currentProfile();const {data,error}=await sb.from('gm_bookmarks').select('message_id,created_at').eq('user_id',me.id).order('created_at',{ascending:false}).limit(100);if(error)fail(error);
    const ids=(data||[]).map((x:any)=>x.message_id);if(!ids.length)return [];
    const {data:messages,error:e}=await sb.from('gm_messages').select('*').in('id',ids);if(e)fail(e);
    const senderIds=[...new Set((messages||[]).map((m:any)=>m.sender_id))];const {data:people,error:pe}=await sb.from('gm_profiles').select('id,username,display_name').in('id',senderIds);if(pe)fail(pe);
    const safePeople=await hidePrivateLastSeen(sb,people||[]);const senders=new Map(safePeople.map((p:any)=>[p.id,p]));const byId=new Map((messages||[]).map((m:any)=>[m.id,messageShape(m,senders.get(m.sender_id))]));return (data||[]).map((x:any)=>({createdAt:x.created_at,message:byId.get(x.message_id)})).filter((x:any)=>x.message);
  },
  async pins(conversationId:string){
    const sb=await getSupabase();const {data,error}=await sb.from('gm_pinned_messages').select('message_id,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:false});if(error)fail(error);
    const ids=(data||[]).map((x:any)=>x.message_id);if(!ids.length)return [];
    const {data:messages,error:e}=await sb.from('gm_messages').select('*').in('id',ids);if(e)fail(e);
    const senderIds=[...new Set((messages||[]).map((m:any)=>m.sender_id))];const {data:people,error:pe}=await sb.from('gm_profiles').select('id,username,display_name').in('id',senderIds);if(pe)fail(pe);
    const safePeople=await hidePrivateLastSeen(sb,people||[]);const senders=new Map(safePeople.map((p:any)=>[p.id,p]));const byId=new Map((messages||[]).map((m:any)=>[m.id,messageShape(m,senders.get(m.sender_id))]));return (data||[]).map((x:any)=>({createdAt:x.created_at,message:byId.get(x.message_id)})).filter((x:any)=>x.message);
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
