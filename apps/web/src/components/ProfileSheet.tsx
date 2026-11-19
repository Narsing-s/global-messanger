import React,{useEffect,useState} from 'react';
import {ArrowLeft,Camera,Check,Copy,Image as ImageIcon,Lock,MessageCircle,MoreHorizontal,Phone,Shield,Users,Video} from 'lucide-react';
import {getSupabase} from '../supabase';
import {api} from '../api';
import {socialApi} from '../services/social-api';

type Person={id:string;username:string;displayName:string;avatarUrl?:string|null;lastSeenAt?:string|null};
type Props={person:Person;isSelf:boolean;online?:boolean;onClose:()=>void;onMessage?:(person:Person)=>void;onCall?:(kind:'audio'|'video')=>void;onProfileUpdated?:(person:Person)=>void};
const pretty=(v?:string|null)=>v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'Not available';
export default function ProfileSheet({person,isSelf,online=false,onClose,onMessage,onCall,onProfileUpdated}:Props){
 const [details,setDetails]=useState<any>(null),[privacy,setPrivacy]=useState<any>(null),[groups,setGroups]=useState<any[]>([]),[media,setMedia]=useState<any[]>([]);
 const [editing,setEditing]=useState(false),[name,setName]=useState(person.displayName),[bio,setBio]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [showPrivacy,setShowPrivacy]=useState(false),[copied,setCopied]=useState(false);
 async function refresh(){
  setError('');
  try{
   const p=await socialApi.profileDetails(person.id);setDetails(p);setName(p?.display_name||person.displayName);setBio(p?.bio||'');if(isSelf&&p)onProfileUpdated?.({id:p.id,username:p.username,displayName:p.display_name,avatarUrl:p.avatar_url,lastSeenAt:p.last_seen_at});
   if(isSelf){setPrivacy(await socialApi.privacy());}
   const sb=await getSupabase();
   const {data:members,error:me}=await sb.from('gm_conversation_members').select('conversation_id').eq('user_id',person.id);
   if(me)throw me;
   const ids=(members||[]).map((m:any)=>m.conversation_id);
   if(ids.length){
    const {data:convs,error:ce}=await sb.from('gm_conversations').select('id,title,is_group').in('id',ids).eq('is_group',true);
    if(ce)throw ce;setGroups(convs||[]);
    const groupIds=(convs||[]).map((c:any)=>c.id);
    if(ids.length){
     const {data:files,error:fe}=await sb.from('gm_attachments').select('id,conversation_id,file_name,mime_type,bucket_id,object_path,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(6);
     if(fe)throw fe;
     const signed=await Promise.all((files||[]).map(async(f:any)=>{const {data}=await sb.storage.from(f.bucket_id).createSignedUrl(f.object_path,900);return {...f,url:data?.signedUrl||null};}));
     setMedia(signed);
    }else setMedia([]);
   }else{setGroups([]);setMedia([]);}
  }catch(e:any){setError(e.message||'Unable to load this profile.');}
 }
 useEffect(()=>{refresh();},[person.id]);
 async function saveProfile(){
  setBusy(true);setError('');
  try{const sb=await getSupabase();const {error:e}=await sb.from('gm_profiles').update({display_name:name.trim(),bio:bio.trim()}).eq('id',person.id);if(e)throw e;setEditing(false);await refresh();setSaved(true);window.setTimeout(()=>setSaved(false),1800);}
  catch(e:any){setError(e.message||'Unable to save profile.');}finally{setBusy(false);}
 }
 async function uploadPhoto(file?:File){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPG, PNG or WebP image under 5 MB.');return;}
  setBusy(true);
  try{const uploaded=await api.upload(file);const sb=await getSupabase();const {error:e}=await sb.from('gm_profiles').update({avatar_url:uploaded.url}).eq('id',person.id);if(e)throw e;await refresh();}
  catch(e:any){setError(e.message||'Photo upload failed.');}finally{setBusy(false);}
 }
 async function updatePrivacy(patch:Record<string,unknown>){
  try{setPrivacy(await socialApi.updatePrivacy({...privacy,...patch}));}
  catch(e:any){setError(e.message||'Unable to update privacy settings.');}
 }
 async function copyUsername(){await navigator.clipboard?.writeText('@'+person.username);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}
 const avatar=details?.avatar_url||person.avatarUrl;
 return <div className="gm-profile-backdrop" role="dialog" aria-modal="true" aria-label="User profile">
  <section className="gm-profile-sheet">
   <header className="gm-profile-toolbar"><button onClick={onClose} aria-label="Close profile"><ArrowLeft/></button><span>{isSelf?'Your profile':'Contact profile'}</span><button onClick={()=>setShowPrivacy(v=>!v)} aria-label="Privacy options"><MoreHorizontal/></button></header>
   <div className="gm-profile-cover"><div className="gm-profile-glow"/></div>
   <div className="gm-profile-content">
    <div className="gm-profile-hero">
     <div className="gm-profile-photo">{avatar?<img src={avatar} alt={details?.display_name||person.displayName}/>:<span>{(details?.display_name||person.displayName||'GM').slice(0,2).toUpperCase()}</span>}
      {isSelf&&<label className="gm-photo-edit" title="Change profile photo"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadPhoto(e.target.files?.[0])}/></label>}
     </div>
     <div className="gm-profile-identity"><h1>{details?.display_name||person.displayName}</h1><p>@{person.username}</p>{!isSelf&&<span className={'gm-presence '+(online?'online':'')}>{online?'Online':'Global Messenger user'}</span>}</div>
     {!isSelf&&<div className="gm-profile-actions"><button onClick={()=>onMessage?.(person)}><MessageCircle/>Message</button><button onClick={()=>onCall?.('audio')}><Phone/>Call</button><button onClick={()=>onCall?.('video')}><Video/>Video</button></div>}
    </div>
    <div className="gm-profile-card">
     <small>ABOUT</small>
     {editing?<textarea value={bio} maxLength={500} onChange={e=>setBio(e.target.value)} placeholder="Tell people a little about yourself"/>:<p>{details?.bio||'No about information added yet.'}</p>}
     {isSelf&&editing&&<div className="gm-profile-edit-fields"><label>Display name<input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label><div><button onClick={()=>setEditing(false)}>Cancel</button><button className="primary" disabled={busy||!name.trim()} onClick={saveProfile}>{busy?'Saving…':'Save profile'}</button></div></div>}
     {isSelf&&!editing&&<button className="gm-profile-text-action" onClick={()=>setEditing(true)}>Edit profile</button>}
     {saved&&<span className="gm-profile-saved"><Check size={14}/> Saved</span>}
    </div>
    <div className="gm-profile-grid">
     <div className="gm-profile-card"><small>USERNAME</small><button className="gm-copy-row" onClick={copyUsername}><b>@{person.username}</b>{copied?<Check size={16}/>:<Copy size={16}/>}</button><span>Share your unique Messenger identity</span></div>
     <div className="gm-profile-card"><small>LAST SEEN</small><b>{isSelf||details?.last_seen_at?pretty(details?.last_seen_at):'Hidden by privacy settings'}</b><span>Visibility is controlled by account privacy</span></div>
    </div>
    {!isSelf&&<div className="gm-profile-card"><small><Users size={13}/> SHARED GROUPS</small>{groups.length?<div className="gm-shared-groups">{groups.slice(0,5).map(g=><span key={g.id}>{g.title||'Group conversation'}</span>)}</div>:<p>No shared groups yet.</p>}</div>}
    {!isSelf&&media.length>0&&<div className="gm-profile-card"><small><ImageIcon size={13}/> SHARED MEDIA</small><div className="gm-profile-media">{media.map(m=><a key={m.id} href={m.url||undefined} target="_blank" rel="noreferrer">{m.mime_type?.startsWith('image/')&&m.url?<img src={m.url} alt={m.file_name}/>:<span><ImageIcon/></span>}</a>)}</div></div>}
    {isSelf&&showPrivacy&&<div className="gm-profile-card gm-privacy-card"><small><Shield size={13}/> PROFILE & STORY PRIVACY</small>
      <label>Profile discovery<select value={privacy?.profile_visibility?'everyone':'nobody'} onChange={e=>updatePrivacy({profile_visibility:e.target.value==='everyone'})}><option value="everyone">Visible to Messenger users</option><option value="nobody">Hidden from discovery</option></select></label>
      <label>Profile photo<select value={privacy?.profile_photo_visibility||'everyone'} onChange={e=>updatePrivacy({profile_photo_visibility:e.target.value})}><option value="everyone">Everyone</option><option value="nobody">Nobody except me</option></select></label>
      <label>About information<select value={privacy?.about_visibility||'everyone'} onChange={e=>updatePrivacy({about_visibility:e.target.value})}><option value="everyone">Everyone</option><option value="nobody">Nobody except me</option></select></label>
      <label>Default story audience<select value={privacy?.default_story_audience||'everyone'} onChange={e=>updatePrivacy({default_story_audience:e.target.value})}><option value="everyone">All users</option><option value="selected">Only selected people</option><option value="except">All except selected people</option><option value="only_me">Only me</option></select></label>
      <label className="gm-privacy-toggle"><input type="checkbox" checked={privacy?.save_stories_to_archive!==false} onChange={e=>updatePrivacy({save_stories_to_archive:e.target.checked})}/> Save my stories to archive</label>
    </div>}
    {error&&<div className="gm-profile-error">{error}</div>}
    <div className="gm-profile-foot"><Lock size={14}/> Your profile information is shared according to your privacy settings.</div>
   </div>
  </section>
 </div>;
}
