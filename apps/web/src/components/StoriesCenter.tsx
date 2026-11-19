import React,{useEffect,useMemo,useState} from 'react';
import {Archive,ArrowLeft,Camera,Clock,Eye,Image as ImageIcon,Plus,Send,Shield,Trash2,Upload,Users,X} from 'lucide-react';
import {api} from '../api';
import {socialApi,type Story,type StoryAudience} from '../services/social-api';

type Person={id:string;username:string;displayName:string;avatarUrl?:string|null};
type Props={currentUser:Person;onProfile?:(person:Person)=>void};
const emojis=['❤️','🔥','😂','👏','😍','👍'];
const themes=['aurora','ocean','sunset','midnight','rose','forest'];
const themeLabels:Record<string,string>={aurora:'Aurora',ocean:'Ocean',sunset:'Sunset',midnight:'Midnight',rose:'Rose',forest:'Forest'};
export default function StoriesCenter({currentUser,onProfile}:Props){
 const [stories,setStories]=useState<Story[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [composer,setComposer]=useState(false),[body,setBody]=useState(''),[file,setFile]=useState<File|null>(null),[theme,setTheme]=useState('aurora');
 const [audience,setAudience]=useState<StoryAudience>('everyone'),[selected,setSelected]=useState<Person[]>([]);
 const [search,setSearch]=useState(''),[found,setFound]=useState<Person[]>([]);
 const [active,setActive]=useState<Story|null>(null),[archive,setArchive]=useState<any[]>([]),[showArchive,setShowArchive]=useState(false),[viewers,setViewers]=useState<any[]>([]);
 async function refresh(){try{const data=await socialApi.stories();setStories(data);setError('');}catch(e:any){setError(e.message||'Stories are temporarily unavailable.');}}
 useEffect(()=>{refresh();socialApi.privacy().then(p=>setAudience(p.default_story_audience||'everyone')).catch(()=>{});},[]);
 const byAuthor=useMemo(()=>{const map=new Map<string,Story[]>();for(const s of stories){const list=map.get(s.author_id)||[];list.push(s);map.set(s.author_id,list);}return [...map.entries()].map(([authorId,items])=>({authorId,items:items.sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at)),person:items[0].author}));},[stories]);
 async function searchPeople(){if(search.trim().length<2)return;try{setFound((await api.searchUsers(search)).filter((p:any)=>p.id!==currentUser.id));}catch(e:any){setError(e.message);}}
 async function publish(){
  setBusy(true);setError('');
  try{await socialApi.createStory({body,file,backgroundTheme:theme,audienceMode:audience,audienceIds:selected.map(p=>p.id)});setComposer(false);setBody('');setFile(null);setSelected([]);await refresh();}
  catch(e:any){setError(e.message||'Unable to publish story.');}finally{setBusy(false);}
 }
 async function openGroup(group:{items:Story[]}){const story=group.items.find(s=>s.id!==active?.id)||group.items[0];setActive(story);setViewers([]);try{await socialApi.markViewed(story.id);}catch(e:any){setError(e.message);}if(story.author_id===currentUser.id)try{setViewers(await socialApi.viewers(story.id));}catch{}}
 async function chooseStory(story:Story){setActive(story);setViewers([]);try{await socialApi.markViewed(story.id);}catch(e:any){setError(e.message);}if(story.author_id===currentUser.id)try{setViewers(await socialApi.viewers(story.id));}catch{}}
 async function react(emoji:string){if(!active)return;try{await socialApi.react(active.id,emoji);await refresh();}catch(e:any){setError(e.message);}}
 async function remove(){if(!active||active.author_id!==currentUser.id)return;try{await socialApi.remove(active.id);setActive(null);await refresh();}catch(e:any){setError(e.message);}}
 async function archiveStory(){if(!active||active.author_id!==currentUser.id)return;try{await socialApi.archiveStory(active.id);setActive(null);await refresh();}catch(e:any){setError(e.message);}}
 async function openArchive(){setShowArchive(true);try{setArchive(await socialApi.archive());}catch(e:any){setError(e.message);}}
 const mine=byAuthor.find(g=>g.authorId===currentUser.id);
 return <section className="gm-stories">
  <div className="gm-stories-heading"><div><span>YOUR MOMENTS</span><h3>Stories</h3></div><div className="gm-story-heading-actions"><button onClick={()=>setComposer(true)}><Plus size={14}/> Add story</button><button onClick={openArchive}><Archive size={16}/> Archive</button></div></div>
  <div className="gm-story-strip">
   <button className="gm-story-tile gm-story-create" onClick={()=>mine?chooseStory(mine.items[0]):setComposer(true)}><span className="gm-story-ring"><span>{currentUser.avatarUrl?<img src={currentUser.avatarUrl} alt=""/>:(currentUser.displayName||'Me').slice(0,1)}</span><i><Plus size={13}/></i></span><b>Your story</b><small>{mine?mine.items.length+' active':'Share a moment'}</small></button>
   {byAuthor.filter(g=>g.authorId!==currentUser.id).map(group=><button className="gm-story-tile" key={group.authorId} onClick={()=>openGroup(group)} onContextMenu={e=>{e.preventDefault();if(group.person)onProfile?.(group.person);}}>
    <span className="gm-story-ring"><span>{group.person?.avatarUrl?<img src={group.person.avatarUrl} alt=""/>:(group.person?.displayName||'U').slice(0,1)}</span></span><b>{group.person?.displayName||'Messenger user'}</b><small>{group.items.length} {group.items.length===1?'story':'stories'}</small>
   </button>)}
  </div>
  {error&&<div className="gm-story-error">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
  {composer&&<div className="gm-story-backdrop"><div className="gm-story-composer">
   <header><div><span>CREATE MOMENT</span><h3>Share a story</h3></div><button onClick={()=>setComposer(false)}><X/></button></header>
   {file?<div className="gm-story-file"><span><Upload/></span><div><b>{file.name}</b><small>{(file.size/1024/1024).toFixed(1)} MB · {file.type}</small></div><button onClick={()=>setFile(null)}><X/></button></div>:<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={1200} placeholder="What's happening? Write a moment…"/>}
   <div className="gm-story-theme">{themes.map(t=><button key={t} className={theme===t?'selected '+t:t} onClick={()=>setTheme(t)}>{themeLabels[t]}</button>)}</div>
   <div className="gm-story-tools"><label><Camera/> Add photo/video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><span>{body.length}/1200</span></div>
   <label className="gm-story-audience"><Shield size={16}/> <span>Who can view this?</span><select value={audience} onChange={e=>setAudience(e.target.value as StoryAudience)}><option value="everyone">All users</option><option value="selected">Only selected people</option><option value="except">All except selected people</option><option value="only_me">Only me</option></select></label>
   {(audience==='selected'||audience==='except')&&<div className="gm-story-people"><div className="gm-story-search"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchPeople()} placeholder="Find people by name or username"/><button onClick={searchPeople}>Find</button></div><div className="gm-story-selected">{selected.map(p=><button key={p.id} onClick={()=>setSelected(selected.filter(x=>x.id!==p.id))}>{p.displayName}<X size={12}/></button>)}</div>{found.map(p=><button className="gm-story-person" key={p.id} onClick={()=>setSelected(old=>old.some(x=>x.id===p.id)?old:[...old,p])}><Users size={14}/>{p.displayName} <span>@{p.username}</span><Plus size={14}/></button>)}</div>}
   <button className="gm-story-publish" disabled={busy||(!body.trim()&&!file)||(audience==='selected'&&!selected.length)} onClick={publish}>{busy?'Publishing…':<><Send size={16}/> Publish story</>}</button>
  </div></div>}
  {active&&<div className="gm-story-backdrop"><div className={'gm-story-viewer '+(active.background_theme||'aurora')}>
   <header><button onClick={()=>setActive(null)}><ArrowLeft/></button><div><b>{active.author?.display_name||'Story'}</b><small><Clock size={12}/> {new Date(active.created_at).toLocaleString()}</small></div>{active.author_id===currentUser.id&&<button onClick={remove}><Trash2/></button>}</header>
   <div className="gm-story-progress"><i/></div>
   <div className="gm-story-stage">{active.media_url&&active.media_type==='image'&&<img src={active.media_url} alt="Story"/>}{active.media_url&&active.media_type==='video'&&<video src={active.media_url} controls autoPlay playsInline/>}{active.body&&<p>{active.body}</p>}</div>
   {active.author_id===currentUser.id?<div className="gm-story-owner"><button onClick={archiveStory}><Archive size={15}/> Archive story</button><span><Eye size={15}/> {viewers.length} views</span></div>:<div className="gm-story-reactions">{emojis.map(e=><button key={e} onClick={()=>react(e)}>{e}</button>)}</div>}
  </div></div>}
  {showArchive&&<div className="gm-story-backdrop"><div className="gm-story-archive"><header><div><span>PRIVATE TO YOU</span><h3>Story archive</h3></div><button onClick={()=>setShowArchive(false)}><X/></button></header>{archive.length?archive.map(s=><div key={s.id}><span>{s.body||s.media_type+' story'}</span><small>{new Date(s.created_at).toLocaleDateString()}</small></div>):<p>Your saved stories will appear here after they expire.</p>}</div></div>}
 </section>;
}
