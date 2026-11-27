import { getSupabase } from '../supabase';
import { api } from '../api';

type Handler=(...args:any[])=>void;
class MessengerSocket {
  connected=false;
  private handlers=new Map<string,Set<Handler>>();
  private channels=new Map<string,any>();
  private presence:any=null;
  private profileId:string|null=null;
  private privacy:any={online_status:true,typing_indicators:true};
  constructor(_token:string) { void this.connect(); }
  on(event:string,fn:Handler){if(!this.handlers.has(event))this.handlers.set(event,new Set());this.handlers.get(event)!.add(fn);return this;}
  once(event:string,fn:Handler){const wrap:Handler=(...a)=>{this.off(event,wrap);fn(...a)};return this.on(event,wrap);}
  off(event:string,fn?:Handler){if(!fn)this.handlers.delete(event);else this.handlers.get(event)?.delete(fn);return this;}
  private emitLocal(event:string,...args:any[]){for(const fn of this.handlers.get(event)||[])fn(...args);}
  async connect(){
    try{
      const sb=await getSupabase();
      const {data:{user}}=await sb.auth.getUser();
      if(user){const {data:profile}=await sb.from('gm_profiles').select('id').eq('auth_user_id',user.id).single();this.profileId=profile?.id||null;if(this.profileId){const {data:privacy}=await sb.from('gm_privacy_settings').select('online_status,typing_indicators').eq('user_id',this.profileId).maybeSingle();this.privacy={online_status:privacy?.online_status!==false,typing_indicators:privacy?.typing_indicators!==false};}}else this.profileId=null;
      const channel=sb.channel('gm-presence',{config:{presence:{key:this.profileId||crypto.randomUUID()}}});
      this.presence=channel;
      channel.on('presence',{event:'sync'},()=>{
        const state=channel.presenceState();
        void Promise.all(Object.entries(state).map(async([key,entries])=>{const {data:visible}=await sb.rpc('gm_online_visible',{target_user:key});if(visible!==false)this.emitLocal('presence:update',{userId:key,online:Array.isArray(entries)&&entries.length>0});}));
      });
      channel.subscribe((status:string)=>{
        if(status==='SUBSCRIBED'){this.connected=true;this.emitLocal('connect');}
        else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){this.connected=false;this.emitLocal('connect_error',new Error('Supabase Realtime connection failed'));}
        else if(status==='CLOSED'){this.connected=false;this.emitLocal('disconnect');}
      });
      if(user&&this.profileId&&this.privacy.online_status)await channel.track({userId:this.profileId,online:true,lastSeenAt:new Date().toISOString()});
      if(user&&this.profileId){const inbox=sb.channel('gm-inbox-'+this.profileId).on('postgres_changes',{event:'INSERT',schema:'public',table:'gm_messages'},(payload:any)=>{if(payload.new?.sender_id!==this.profileId)this.emitLocal('inbox:message',{conversationId:payload.new?.conversation_id});}).subscribe();this.channels.set('__inbox',inbox);}
    }catch(e:any){this.emitLocal('connect_error',e);}
    return this;
  }
  async disconnect(){
    const sb=await getSupabase().catch(()=>null);
    if(sb){for(const ch of this.channels.values())await sb.removeChannel(ch);if(this.presence)await sb.removeChannel(this.presence);}
    this.channels.clear();this.presence=null;this.connected=false;
  }
  emit(event:string,data?:any,ack?:(v?:any)=>void){
    if(event==='message:send'&&data?.conversationId){
      if(data.type==='call-signal'){
        void (async()=>{const sb=await getSupabase();const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('Please sign in again.');const {data:profile}=await sb.from('gm_profiles').select('id').eq('auth_user_id',user.id).single();if(!profile)throw new Error('Messenger profile unavailable.');const body=String(data.body||'');const prefix='__GM_CALL__';if(!body.startsWith(prefix))throw new Error('Invalid call signal.');const payload=JSON.parse(body.slice(prefix.length));const {error}=await sb.from('gm_call_signals').insert({conversation_id:data.conversationId,sender_id:profile.id,call_id:String(payload.callId||''),payload});if(error)throw error;ack?.({ok:true});})().catch((e:any)=>{this.emitLocal('connect_error',e);ack?.({ok:false,error:e.message});});
        return this;
      }
      void api.sendMessage(data.conversationId,String(data.body||''),{type:data.type||'text',metadata:{clientId:data.clientId||null}}).then((m:any)=>{this.emitLocal('message:new',m);ack?.({ok:true,message:m});}).catch((e:any)=>{this.emitLocal('connect_error',e);ack?.({ok:false,error:e.message});});return this;
    }
    if(event==='conversation:join'&&typeof data==='string'){void this.join(data);ack?.({ok:true});return this;}
    if(event==='conversation:leave'&&typeof data==='string'){void this.leave(data);ack?.({ok:true});return this;}
    if(event==='typing'&&data?.conversationId){const ch=this.channels.get(data.conversationId);if(this.privacy.typing_indicators)void ch?.send({type:'broadcast',event:'typing',payload:{userId:this.profileId,typing:!!data.typing}});ack?.({ok:true});return this;}
    return this;
  }
  private async join(id:string){
    if(this.channels.has(id))return;
    const sb=await getSupabase();
    const ch=sb.channel('gm-conversation-'+id,{config:{broadcast:{self:false},presence:{key:this.profileId||crypto.randomUUID()}}});
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'gm_messages',filter:'conversation_id=eq.'+id},(p:any)=>{
      const m=p.new;this.emitLocal('message:new',{id:m.id,conversationId:m.conversation_id,senderId:m.sender_id,body:m.body,createdAt:m.created_at,editedAt:m.edited_at,deletedAt:m.deleted_at,type:m.type,...(m.metadata||{})});
    });
    ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'gm_messages',filter:'conversation_id=eq.'+id},(p:any)=>{
      const m=p.new;this.emitLocal(m.deleted_at?'message:deleted':'message:updated',m.deleted_at?{id:m.id,deletedAt:m.deleted_at}: {id:m.id,conversationId:m.conversation_id,senderId:m.sender_id,body:m.body,createdAt:m.created_at,editedAt:m.edited_at,type:m.type,...(m.metadata||{})});
    });
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'gm_call_signals',filter:'conversation_id=eq.'+id},(p:any)=>{const row=p.new;if(row.sender_id!==this.profileId)this.emitLocal('call:signal',{conversationId:id,senderId:row.sender_id,payload:row.payload});});
    ch.on('broadcast',{event:'typing'},(p:any)=>{if(p.payload?.userId!==this.profileId)this.emitLocal('typing',p.payload);});
    ch.on('presence',{event:'sync'},()=>{
      const state=ch.presenceState();
      void Promise.all(Object.entries(state).map(async([key,entries])=>{const {data:visible}=await sb.rpc('gm_online_visible',{target_user:key});if(visible!==false)this.emitLocal('presence:update',{userId:key,online:Array.isArray(entries)&&entries.length>0});}));
    });
    ch.subscribe((status:string)=>{if(status==='SUBSCRIBED'&&this.profileId&&this.privacy.online_status)void ch.track({userId:this.profileId,online:true});});
    this.channels.set(id,ch);
  }
  private async leave(id:string){const ch=this.channels.get(id);if(!ch)return;const sb=await getSupabase();await sb.removeChannel(ch);this.channels.delete(id);}
}
export type Socket=MessengerSocket;
export function createMessengerSocket(token:string):Socket{return new MessengerSocket(token);}
