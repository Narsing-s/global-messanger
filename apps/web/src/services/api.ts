import { api, API } from '../api';
import { getSupabase } from '../supabase';
export { api, API };

async function me(){
  const sb=await getSupabase();
  const {data:{user},error}=await sb.auth.getUser();
  if(error||!user)throw new Error('Please sign in again.');
  const {data:profile,error:e}=await sb.from('gm_profiles').select('id').eq('auth_user_id',user.id).single();
  if(e||!profile)throw e||new Error('Messenger profile is unavailable.');
  return {sb,user,profile};
}
export const productApi = {
  async features(){return {features:{messaging:true,groups:true,media:true,realtime:true,e2ee:true}};},
  async sessions(){const {sb,profile}=await me();const {data,error}=await sb.from('gm_user_devices').select('id,device_name,platform,trusted,last_seen_at,created_at').eq('user_id',profile.id).order('last_seen_at',{ascending:false});if(error)throw error;return data||[];},
  async revokeSession(id:string){const {sb,profile}=await me();const {error}=await sb.from('gm_user_devices').delete().eq('id',id).eq('user_id',profile.id);if(error)throw error;return {success:true};},
  async revokeOthers(currentSessionId?:string){const {sb,profile}=await me();let q=sb.from('gm_user_devices').delete().eq('user_id',profile.id);if(currentSessionId)q=q.neq('id',currentSessionId);const {error}=await q;if(error)throw error;return {success:true};},
  async privacy(){const {sb,profile}=await me();const {data,error}=await sb.from('gm_privacy_settings').select('*').eq('user_id',profile.id).maybeSingle();if(error)throw error;return data||{user_id:profile.id,profile_visibility:true,read_receipts:true,online_status:true,last_seen_visibility:true,typing_indicators:true};},
  async updatePrivacy(body:Record<string,unknown>){const {sb,profile}=await me();const {data,error}=await sb.from('gm_privacy_settings').upsert({user_id:profile.id,...body,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('*').single();if(error)throw error;return data;},
  async media(params=''){const query=new URLSearchParams(params);return api.media(query.get('conversationId')||undefined,query.get('q')||undefined,Number(query.get('limit')||100));},
  async universalSearch(q:string){
    const {sb,profile}=await me();const term=q.trim().replace(/[,%]/g,'');if(term.length<2)return {users:[],messages:[]};
    const [users,messages]=await Promise.all([
      sb.from('gm_profiles').select('id,username,display_name,avatar_url').neq('id',profile.id).or('username.ilike.%'+term+'%,display_name.ilike.%'+term+'%').limit(10),
      sb.from('gm_messages').select('id,conversation_id,sender_id,body,created_at').ilike('body','%'+term+'%').order('created_at',{ascending:false}).limit(20)
    ]);
    if(users.error)throw users.error;if(messages.error)throw messages.error;
    return {users:users.data||[],messages:messages.data||[]};
  }
};
