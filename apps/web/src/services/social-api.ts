import { getSupabase } from '../supabase';

export type StoryAudience = 'everyone' | 'selected' | 'except' | 'only_me';
export type Story = {
  id:string; author_id:string; media_type:'text'|'image'|'video'; body:string;
  media_path:string|null; media_url?:string|null; background_theme:string;
  audience_mode:StoryAudience; expires_at:string; archived_at:string|null; created_at:string;
  author?:any; view_count?:number; reactions?:any[];
};
const fail=(error:any):never=>{throw new Error(error?.message||'Social request failed')};
async function context(){
  const sb=await getSupabase();
  const {data:{user},error}=await sb.auth.getUser();
  if(error||!user)throw new Error('Please sign in again.');
  const {data:profile,error:e}=await sb.rpc('gm_ensure_current_profile');
  if(e||!profile?.id)fail(e||new Error('Messenger profile unavailable'));
  return {sb,user,profile};
}
const allowedMedia=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm']);

export const socialApi={
  async stories(){
    const {sb,profile}=await context();
    const {data,error}=await sb.from('gm_stories').select('*').is('archived_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100);
    if(error)fail(error);
    const rows=(data||[]) as Story[];
    const ids=[...new Set(rows.map(x=>x.author_id))];
    const authors=await Promise.all(ids.map(async id=>{const {data,error}=await sb.rpc('gm_get_profile_details',{target_user:id});if(error)fail(error);return [id,data] as const;}));
    const authorMap=new Map(authors);
    const storyIds=rows.map(x=>x.id);
    let views:any[]=[];
    let reactions:any[]=[];
    if(storyIds.length){
      const [v,r]=await Promise.all([
        sb.from('gm_story_views').select('story_id,viewer_id').in('story_id',storyIds),
        sb.from('gm_story_reactions').select('story_id,user_id,emoji').in('story_id',storyIds)
      ]);
      if(v.error)fail(v.error);if(r.error)fail(r.error);
      views=v.data||[];reactions=r.data||[];
    }
    return await Promise.all(rows.map(async story=>{
      let mediaUrl:string|null=null;
      if(story.media_path){const {data,error}=await sb.storage.from('gm-story-media').createSignedUrl(story.media_path,1800);if(!error&&data)mediaUrl=data.signedUrl;}
      return {...story,author:authorMap.get(story.author_id),media_url:mediaUrl,
        view_count:story.author_id===profile.id?views.filter(v=>v.story_id===story.id).length:0,
        reactions:reactions.filter(r=>r.story_id===story.id)};
    }));
  },
  async archive(){
    const {sb,profile}=await context();
    const {data:privacy,error:privacyError}=await sb.from('gm_privacy_settings').select('save_stories_to_archive').eq('user_id',profile.id).maybeSingle();
    if(privacyError)fail(privacyError);
    if(privacy?.save_stories_to_archive===false)return [];
    const {data,error}=await sb.from('gm_stories').select('*').eq('author_id',profile.id)
      .or('archived_at.not.is.null,expires_at.lte.'+new Date().toISOString())
      .gte('created_at',new Date(Date.now()-30*86400000).toISOString())
      .order('created_at',{ascending:false}).limit(100);
    if(error)fail(error);
    return data||[];
  },
  async createStory(input:{body?:string;file?:File|null;backgroundTheme?:string;audienceMode:StoryAudience;audienceIds?:string[]}){
    const {sb,profile}=await context();
    const file=input.file||null;
    const body=(input.body||'').trim();
    if(!file&&!body)throw new Error('Add a photo, video or text before publishing.');
    if(file&&(!allowedMedia.has(file.type)||file.size>25*1024*1024))throw new Error('Use JPG, PNG, WebP, MP4 or WebM media up to 25 MB.');
    if(input.audienceMode==='selected'&&!(input.audienceIds||[]).length)throw new Error('Choose at least one person for this story.');
    const mediaType=file?(file.type.startsWith('video/')?'video':'image'):'text';
    const storyId=crypto.randomUUID();
    const safeName=file?file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)||'story-media':null;
    const mediaPath=file?profile.id+'/'+storyId+'/'+crypto.randomUUID()+'-'+safeName:null;
    const {data:story,error}=await sb.from('gm_stories').insert({
      id:storyId,author_id:profile.id,media_type:mediaType,body,media_path:mediaPath,
      background_theme:input.backgroundTheme||'aurora',audience_mode:input.audienceMode
    }).select('*').single();
    if(error)fail(error);
    let uploadedPath:string|null=null;
    try{
      if(input.audienceMode==='selected'||input.audienceMode==='except'){
        const audienceIds=[...new Set(input.audienceIds||[])].filter(id=>id!==profile.id);
        if(audienceIds.length){
          const {error:e}=await sb.from('gm_story_audience').insert(audienceIds.map(user_id=>({
            story_id:story.id,user_id,audience_type:input.audienceMode==='selected'?'include':'exclude'
          })));
          if(e)fail(e);
        }
      }
      if(file&&mediaPath){
        const {error:e}=await sb.storage.from('gm-story-media').upload(mediaPath,file,{contentType:file.type,upsert:false});
        if(e)fail(e);
        uploadedPath=mediaPath;
      }
      return story.id as string;
    }catch(error){
      if(uploadedPath)await sb.storage.from('gm-story-media').remove([uploadedPath]);
      await sb.from('gm_stories').delete().eq('id',story.id).eq('author_id',profile.id);
      throw error;
    }
  },
  async markViewed(storyId:string){
    const {sb,profile}=await context();
    const {error}=await sb.from('gm_story_views').insert({story_id:storyId,viewer_id:profile.id});
    if(error&&error.code!=='23505')fail(error);
  },
  async react(storyId:string,emoji:string){
    const {sb,profile}=await context();
    const {error}=await sb.from('gm_story_reactions').upsert({story_id:storyId,user_id:profile.id,emoji},{onConflict:'story_id,user_id'});
    if(error)fail(error);
  },
  async viewers(storyId:string){
    const {sb}=await context();
    const {data,error}=await sb.from('gm_story_views').select('viewer_id,viewed_at').eq('story_id',storyId).order('viewed_at',{ascending:false});
    if(error)fail(error);
    return await Promise.all((data||[]).map(async (view:any)=>{
      const {data:person,error:e}=await sb.rpc('gm_get_profile_details',{target_user:view.viewer_id});
      if(e)fail(e);
      return {...view,user:person};
    }));
  },
  async archiveStory(storyId:string){
    const {sb,profile}=await context();
    const {error}=await sb.from('gm_stories').update({archived_at:new Date().toISOString()}).eq('id',storyId).eq('author_id',profile.id);
    if(error)fail(error);
  },
  async remove(storyId:string){
    const {sb,profile}=await context();
    const {data:story,error}=await sb.from('gm_stories').select('media_path').eq('id',storyId).eq('author_id',profile.id).single();
    if(error)fail(error);
    if(story.media_path){const {error:e}=await sb.storage.from('gm-story-media').remove([story.media_path]);if(e)fail(e);}
    const {error:e}=await sb.from('gm_stories').delete().eq('id',storyId).eq('author_id',profile.id);
    if(e)fail(e);
  },
  async profileDetails(userId:string){
    const {sb}=await context();
    const {data,error}=await sb.rpc('gm_get_profile_details',{target_user:userId});
    if(error)fail(error);
    return data;
  },
  async privacy(){
    const {sb,profile}=await context();
    const {data,error}=await sb.from('gm_privacy_settings').select('*').eq('user_id',profile.id).maybeSingle();
    if(error)fail(error);
    return data||{user_id:profile.id,profile_visibility:true,read_receipts:true,online_status:true,last_seen_visibility:true,typing_indicators:true,about_visibility:'everyone',default_story_audience:'everyone',save_stories_to_archive:true};
  },
  async updatePrivacy(patch:Record<string,unknown>){
    const {sb,profile}=await context();
    const allowed=['profile_visibility','read_receipts','online_status','last_seen_visibility','typing_indicators','about_visibility','default_story_audience','save_stories_to_archive'];
    const values:any={user_id:profile.id,updated_at:new Date().toISOString()};
    for(const key of allowed){
      const value=patch[key];
      if(['profile_visibility','read_receipts','online_status','last_seen_visibility','typing_indicators','save_stories_to_archive'].includes(key)&&typeof value==='boolean')values[key]=value;
      if(key==='about_visibility'){
        if(value==='everyone'||value==='nobody')values[key]=value;
      }
      if(key==='default_story_audience'&&['everyone','selected','except','only_me'].includes(String(value)))values[key]=value;
    }
    const {data,error}=await sb.from('gm_privacy_settings').upsert(values,{onConflict:'user_id'}).select('*').single();
    if(error)fail(error);
    return data;
  }
};
