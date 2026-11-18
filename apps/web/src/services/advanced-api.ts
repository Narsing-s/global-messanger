import { getSupabase } from '../supabase';
import { api, auth } from '../api';
export type ApiOptions = RequestInit & { json?: unknown };
const fail=(e:any):never=>{throw new Error(e?.message||'Supabase request failed')};
async function ctx(){const sb=await getSupabase();const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw new Error('Please sign in again.');const {data:profile,error:e}=await sb.rpc('gm_ensure_current_profile');if(e||!profile||typeof profile!=='object'||Array.isArray(profile))fail(e||new Error('Messenger profile unavailable'));return {sb,user,profile};}
const profileShape=(p:any)=>({id:p.id,username:p.username,displayName:p.display_name,avatarUrl:p.avatar_url,lastSeenAt:p.last_seen_at});
export const securityApi={
 async twoFactorStatus(){const {sb}=await ctx();const {data,error}=await sb.auth.mfa.listFactors();if(error)fail(error);return {enabled:(data.totp||[]).some((x:any)=>x.status==='verified'),factors:data.totp||[]};},
 async setupTwoFactor(){const {sb}=await ctx();const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Global Messenger'});if(error)fail(error);return data;},
 async verifyTwoFactor(code:string,factorId?:string){const {sb}=await ctx();const {data:fs,error:fe}=await sb.auth.mfa.listFactors();if(fe)fail(fe);const factor=(fs.totp||[]).find((x:any)=>!factorId||x.id===factorId);if(!factor)throw new Error('Authenticator setup not found. Start setup again.');const {data:challenge,error:ce}=await sb.auth.mfa.challenge({factorId:factor.id});if(ce)fail(ce);const {data,error}=await sb.auth.mfa.verify({factorId:factor.id,challengeId:challenge.id,code});if(error)fail(error);return data;},
 async enableTwoFactor(_secret:string,code:string){const {sb}=await ctx();const {data,error}=await sb.auth.mfa.listFactors();if(error)fail(error);const factor=(data.totp||[]).find((x:any)=>x.status==='unverified');if(!factor)throw new Error('No pending authenticator setup. Start setup again.');const {data:ch,error:ce}=await sb.auth.mfa.challenge({factorId:factor.id});if(ce)fail(ce);const {data:verified,error:ve}=await sb.auth.mfa.verify({factorId:factor.id,challengeId:ch.id,code});if(ve)fail(ve);return verified;},
 async disableTwoFactor(code:string){const {sb}=await ctx();const {data,error}=await sb.auth.mfa.listFactors();if(error)fail(error);const factor=(data.totp||[]).find((x:any)=>x.status==='verified');if(!factor)throw new Error('No verified authenticator is enabled.');const {data:ch,error:ce}=await sb.auth.mfa.challenge({factorId:factor.id});if(ce)fail(ce);const {error:ve}=await sb.auth.mfa.verify({factorId:factor.id,challengeId:ch.id,code});if(ve)fail(ve);const {error:de}=await sb.auth.mfa.unenroll({factorId:factor.id});if(de)fail(de);return {success:true};},
 async devices(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_session_devices').select('id,device_id,device_name,platform,user_agent,last_seen_at,created_at').eq('user_id',profile.id).order('last_seen_at',{ascending:false});if(error)fail(error);return (data||[]).map((d:any)=>({...d,deviceName:d.device_name,userAgent:d.user_agent}));},
 async logoutDevice(id:string){const {sb,profile}=await ctx();const {error}=await sb.from('gm_session_devices').delete().eq('id',id).eq('user_id',profile.id);if(error)fail(error);return {success:true,note:'Device record removed. To revoke its authentication session, use Logout other devices.'};},
 async logoutOtherDevices(){const {sb,profile}=await ctx();const {error}=await sb.auth.signOut({scope:'others'});if(error)fail(error);const current=localStorage.getItem('gm_device_id');let q=sb.from('gm_session_devices').delete().eq('user_id',profile.id);if(current)q=q.neq('device_id',current);const {error:de}=await q;if(de)fail(de);return {success:true,note:'Other Supabase Auth sessions have been signed out.'};},
 async loginHistory(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_login_history').select('id,event,user_agent,created_at').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(50);if(error)fail(error);return data||[];},
 async securityStatus(){const {sb}=await ctx();const {data,error}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(error)fail(error);return data;},
 async changePassword(currentPassword:string,newPassword:string){const {sb,user}=await ctx();const {error:check}=await sb.auth.signInWithPassword({email:user.email||'',password:currentPassword});if(check)fail(new Error('Current password is incorrect.'));const {error}=await sb.auth.updateUser({password:newPassword});if(error)fail(error);return {success:true};},
 async passkeys(){return {supported:false,items:[],message:'Passkeys are not configured for this Supabase project.'};},
 async passkeyChallenge(){throw new Error('Passkeys are not configured for this Supabase project.');},
 async removePasskey(_id:string){throw new Error('Passkeys are not configured for this Supabase project.');},
 async deviceKey(publicKey:string,version=1){const {sb,profile}=await ctx();const {error}=await sb.from('gm_user_devices').upsert({user_id:profile.id,device_name:'browser',platform:'web',public_key:JSON.stringify({publicKey,version}),trusted:true,last_seen_at:new Date().toISOString()},{onConflict:'user_id,device_name'});if(error)fail(error);return {success:true};},
 async blocked(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_user_blocks').select('blocked_id,created_at').eq('blocker_id',profile.id);if(error)fail(error);const ids=(data||[]).map((x:any)=>x.blocked_id);if(!ids.length)return [];const {data:people,error:e}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url').in('id',ids);if(e)fail(e);const map=new Map((people||[]).map((p:any)=>[p.id,p]));return (data||[]).map((x:any)=>({user:profileShape(map.get(x.blocked_id)||{id:x.blocked_id,username:'',display_name:'Unavailable'}),createdAt:x.created_at}));},
 async block(userId:string){const {sb,profile}=await ctx();if(userId===profile.id)throw new Error('You cannot block your own account.');const {error}=await sb.from('gm_user_blocks').upsert({blocker_id:profile.id,blocked_id:userId},{onConflict:'blocker_id,blocked_id'});if(error)fail(error);return {success:true};},
 async unblock(userId:string){const {sb,profile}=await ctx();const {error}=await sb.from('gm_user_blocks').delete().eq('blocker_id',profile.id).eq('blocked_id',userId);if(error)fail(error);return {success:true};}
};
export const profileApi={
 async me(){const {profile}=await ctx();return profileShape(profile);},
 async update(patch:Record<string,unknown>){const {sb,profile}=await ctx();const safe:any={};if(typeof patch.displayName==='string')safe.display_name=patch.displayName.trim().slice(0,80);if(typeof patch.bio==='string')safe.bio=patch.bio.slice(0,500);if(typeof patch.avatarUrl==='string'||patch.avatarUrl===null)safe.avatar_url=patch.avatarUrl;if(!Object.keys(safe).length)throw new Error('No supported profile fields supplied.');const {data,error}=await sb.from('gm_profiles').update(safe).eq('id',profile.id).select('id,username,display_name,avatar_url,last_seen_at').single();if(error)fail(error);return profileShape(data);},
 async byUsername(username:string){const {sb}=await ctx();const {data,error}=await sb.from('gm_profiles').select('id,username,display_name,avatar_url,last_seen_at').ilike('username',username).maybeSingle();if(error)fail(error);return data?profileShape(data):null;},
 async privacy(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_privacy_settings').select('*').eq('user_id',profile.id).maybeSingle();if(error)fail(error);return data||{user_id:profile.id,profile_visibility:true,read_receipts:true,online_status:true,last_seen_visibility:true,typing_indicators:true};},
 async updatePrivacy(patch:Record<string,unknown>){const {sb,profile}=await ctx();const allowed=['profile_visibility','read_receipts','online_status','last_seen_visibility','typing_indicators'];const values:any={user_id:profile.id,updated_at:new Date().toISOString()};for(const k of allowed)if(typeof patch[k]==='boolean')values[k]=patch[k];const {data,error}=await sb.from('gm_privacy_settings').upsert(values,{onConflict:'user_id'}).select('*').single();if(error)fail(error);return data;}
};
export const organizationApi={
 async update(conversationId:string,patch:Record<string,unknown>){const {sb,profile}=await ctx();const safe:any={conversation_id:conversationId,user_id:profile.id,updated_at:new Date().toISOString()};for(const k of ['favorite','archived','pinned','muted_until','disappearing_seconds'])if(k in patch)safe[k]=patch[k];const {data,error}=await sb.from('gm_conversation_preferences').upsert(safe,{onConflict:'conversation_id,user_id'}).select('*').single();if(error)fail(error);return data;},
 async list(filter='all'){const {sb,profile}=await ctx();let q=sb.from('gm_conversation_preferences').select('*').eq('user_id',profile.id);if(filter==='archived'||filter==='archive')q=q.eq('archived',true);else if(filter==='favorites'||filter==='favorite')q=q.eq('favorite',true);else if(filter==='pinned')q=q.eq('pinned',true);else if(filter==='muted')q=q.gt('muted_until',new Date().toISOString());const {data,error}=await q.order('updated_at',{ascending:false});if(error)fail(error);return data||[];},
 async universalSearch(q:string){const {sb,profile}=await ctx();const term=q.trim().replace(/[,%]/g,'');if(term.length<2)return {users:[],messages:[]};const [u,m]=await Promise.all([sb.from('gm_profiles').select('id,username,display_name,avatar_url').neq('id',profile.id).or('username.ilike.%'+term+'%,display_name.ilike.%'+term+'%').limit(10),sb.from('gm_messages').select('id,conversation_id,sender_id,body,created_at').ilike('body','%'+term+'%').order('created_at',{ascending:false}).limit(30)]);if(u.error)fail(u.error);if(m.error)fail(m.error);return {users:u.data||[],messages:m.data||[]};}
};
export const messagingApi={
 async createPoll(conversationId:string,question:string,options:string[],multiple=false){const {sb,profile}=await ctx();if(options.length<2||options.length>12)throw new Error('A poll needs 2 to 12 options.');const {data:p,error}=await sb.from('gm_polls').insert({conversation_id:conversationId,creator_id:profile.id,question:question.trim(),multiple_choice:multiple}).select('*').single();if(error)fail(error);const {data:o,error:e}=await sb.from('gm_poll_options').insert(options.map((label,position)=>({poll_id:p.id,label:label.trim(),position}))).select('*');if(e)fail(e);return {...p,options:o||[]};},
 async votePoll(pollId:string,optionIds:string[]){const {sb,profile}=await ctx();const {data:p,error}=await sb.from('gm_polls').select('id,multiple_choice').eq('id',pollId).single();if(error)fail(error);if(!optionIds.length)throw new Error('Choose at least one option.');if(!p.multiple_choice&&optionIds.length>1)throw new Error('This poll allows one choice only.');const {data:opts,error:oe}=await sb.from('gm_poll_options').select('id').eq('poll_id',pollId);if(oe)fail(oe);const valid=new Set((opts||[]).map((x:any)=>x.id));if(optionIds.some(id=>!valid.has(id)))throw new Error('One or more poll options are invalid.');const ids=[...valid];if(ids.length){const {error:del}=await sb.from('gm_poll_votes').delete().eq('user_id',profile.id).in('poll_option_id',ids);if(del)fail(del);}const {error:ins}=await sb.from('gm_poll_votes').insert(optionIds.map(poll_option_id=>({poll_option_id,user_id:profile.id})));if(ins)fail(ins);return {success:true};},
 async poll(pollId:string){const {sb}=await ctx();const {data:p,error}=await sb.from('gm_polls').select('*').eq('id',pollId).single();if(error)fail(error);const {data:o,error:e}=await sb.from('gm_poll_options').select('id,label,position').eq('poll_id',pollId).order('position');if(e)fail(e);const ids=(o||[]).map((x:any)=>x.id);const {data:v,error:ve}=await sb.from('gm_poll_votes').select('poll_option_id,user_id').in('poll_option_id',ids);if(ve)fail(ve);return {...p,options:(o||[]).map((x:any)=>({...x,votes:(v||[]).filter((z:any)=>z.poll_option_id===x.id)}))};},
 async schedule(conversationId:string,body:string,scheduledAt:string){const {sb,profile}=await ctx();if(new Date(scheduledAt)<=new Date())throw new Error('Choose a future time.');const {data,error}=await sb.from('gm_scheduled_messages').insert({conversation_id:conversationId,sender_id:profile.id,body,scheduled_for:scheduledAt}).select('*').single();if(error)fail(error);return data;},
 async scheduled(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_scheduled_messages').select('*').eq('sender_id',profile.id).is('cancelled_at',null).is('sent_at',null).order('scheduled_for');if(error)fail(error);return data||[];},
 async cancelScheduled(id:string){const {sb,profile}=await ctx();const {error}=await sb.from('gm_scheduled_messages').update({cancelled_at:new Date().toISOString()}).eq('id',id).eq('sender_id',profile.id);if(error)fail(error);return {success:true};},
 async location(conversationId:string,latitude:number,longitude:number){return api.sendMessage(conversationId,'Shared a location',{type:'location',metadata:{latitude,longitude}});},
 async liveLocation(conversationId:string,latitude:number,longitude:number,expiresAt:string){return api.sendMessage(conversationId,'Shared live location',{type:'live-location',metadata:{latitude,longitude,expiresAt}});},
 async contact(conversationId:string,name:string,phone?:string,email?:string){return api.sendMessage(conversationId,'Shared a contact',{type:'contact',metadata:{name,phone,email}});},
 async event(conversationId:string,title:string,startsAt:string,endsAt?:string){return api.sendMessage(conversationId,title,{type:'event',metadata:{startsAt,endsAt}});},
 async bulkForward(messageIds:string[],conversationId:string){const {sb}=await ctx();const {data,error}=await sb.from('gm_messages').select('body,type,metadata').in('id',messageIds);if(error)fail(error);const out=[];for(const m of data||[])out.push(await api.sendMessage(conversationId,m.body,{type:m.type,metadata:{...(m.metadata||{}),forwarded:true}}));return out;},
 async info(messageId:string){const {sb}=await ctx();const {data,error}=await sb.from('gm_messages').select('id,conversation_id,sender_id,created_at,edited_at,deleted_at').eq('id',messageId).single();if(error)fail(error);const {data:reads,error:re}=await sb.from('gm_conversation_members').select('user_id,last_read_at').eq('conversation_id',data.conversation_id);if(re)fail(re);return {...data,readBy:reads||[]};}
};
async function invokeAi(body:Record<string,unknown>){
 const {sb}=await ctx();const {data,error}=await sb.functions.invoke('gm-ai-assist',{body});
 if(error)fail(error);if(data?.error)throw new Error(data.error);return data;
}
export const aiApi={
 conversationSummary:(conversationId:string)=>invokeAi({action:'summarize',conversationId}),
 documentUnderstanding:(text:string,filename='document')=>invokeAi({action:'document',text,filename}),
 smartNotifications:()=>invokeAi({action:'smart-notifications'}),
 assist:(prompt:string,context='')=>invokeAi({action:'assist',prompt,context})
};
export const supportApi={
 async create(subject:string,category:string,description:string){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_support_tickets').insert({user_id:profile.id,subject,category,description}).select('*').single();if(error)fail(error);return data;},
 async list(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_support_tickets').select('*').eq('user_id',profile.id).order('created_at',{ascending:false});if(error)fail(error);return data||[];}
};
export const entitiesApi={
 async create(kind:string,title:string,payload:Record<string,unknown>={}){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_global_entities').insert({owner_id:profile.id,kind,title,payload}).select('*').single();if(error)fail(error);return data;},
 async list(kind?:string){const {sb,profile}=await ctx();let q=sb.from('gm_global_entities').select('*').eq('owner_id',profile.id);if(kind)q=q.eq('kind',kind);const {data,error}=await q.order('created_at',{ascending:false});if(error)fail(error);return data||[];}
};
export const notificationsApi={
 async list(){const {sb,profile}=await ctx();const {data,error}=await sb.from('gm_notifications').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(100);if(error)fail(error);return data||[];},
 async markRead(){const {sb,profile}=await ctx();const {error}=await sb.from('gm_notifications').update({read_at:new Date().toISOString()}).eq('user_id',profile.id).is('read_at',null);if(error)fail(error);return {success:true};}
};

export const reportsApi={
 async create(targetId:string,targetType:'user'|'message'='user',reason='other',details=''){
  const {sb,profile}=await ctx();
  const row:any={reporter_id:profile.id,reason,details};
  if(targetType==='message')row.message_id=targetId;else row.reported_user_id=targetId;
  const {data,error}=await sb.from('gm_user_reports').insert(row).select('*').single();
  if(error)fail(error);return data;
 }
};
export const exportApi={
 async account(){
  const {sb,profile,user}=await ctx();
  const [members,ownMessages,bookmarks,devices,privacy,history,notifications,tickets,entities]=await Promise.all([
   sb.from('gm_conversation_members').select('conversation_id,joined_at,last_read_at').eq('user_id',profile.id),
   sb.from('gm_messages').select('*').eq('sender_id',profile.id).order('created_at',{ascending:false}).limit(5000),
   sb.from('gm_bookmarks').select('message_id,created_at').eq('user_id',profile.id),
   sb.from('gm_user_devices').select('id,device_name,platform,trusted,last_seen_at,created_at').eq('user_id',profile.id),
   sb.from('gm_privacy_settings').select('*').eq('user_id',profile.id).maybeSingle(),
   sb.from('gm_login_history').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(200),
   sb.from('gm_notifications').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(1000),
   sb.from('gm_support_tickets').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}),
   sb.from('gm_global_entities').select('*').eq('owner_id',profile.id).order('created_at',{ascending:false})
  ]);
  for(const r of [members,ownMessages,bookmarks,devices,privacy,history,notifications,tickets,entities])if(r.error)fail(r.error);
  const ids=(members.data||[]).map((x:any)=>x.conversation_id);
  const conversations=ids.length?await sb.from('gm_conversations').select('*').in('id',ids):{data:[],error:null};
  if(conversations.error)fail(conversations.error);
  return {exportedAt:new Date().toISOString(),account:{id:user.id,email:user.email,profile},conversations:conversations.data||[],memberships:members.data||[],messages:ownMessages.data||[],bookmarks:bookmarks.data||[],devices:devices.data||[],privacy:privacy.data||null,loginHistory:history.data||[],notifications:notifications.data||[],supportTickets:tickets.data||[],globalEntities:entities.data||[]};
 },
 async mediaIndex(){
  const {sb,profile}=await ctx();
  const {data,error}=await sb.from('gm_attachments').select('id,conversation_id,message_id,bucket_id,object_path,file_name,mime_type,size_bytes,created_at').eq('uploader_id',profile.id).order('created_at',{ascending:false}).limit(5000);
  if(error)fail(error);return {exportedAt:new Date().toISOString(),items:data||[]};
 }
};
export const featuresApi={
 list:()=>({backend:'Supabase',authentication:'Supabase Auth',database:'Postgres + RLS',storage:'Supabase Storage',realtime:'Supabase Realtime',calls:'Peer-to-peer WebRTC; TURN/SFU not included',ai:'Supabase Edge Function; requires GROQ_API_KEY'})
};

export const advancedApi=async()=>{throw new Error('Legacy HTTP API is disabled. Use the Supabase-backed APIs exported by this module.');};
