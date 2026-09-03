import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Smart Assist is intentionally removed: it depends on an AI endpoint and is not part of the core messenger.
source = source.replace(/,Sparkles(?=,)/, '');
source = source.replace(/,\[aiLoading,setAiLoading\]=useState\(false\)/, '');
source = source.replace(/async function aiAssist\(\)\{.*?\}function send\(\)/, 'function send()');
source = source.replace(/<button className="icon-btn" title="Smart Assist" onClick=\{aiAssist\} disabled=\{aiLoading\}><Sparkles size=\{18\} \/><\/button>/, '');

// Voice messages: record locally with MediaRecorder, upload through the existing first-party upload route,
// then send the uploaded audio as a normal message attachment over the existing authenticated socket.
if (!source.includes('gmVoiceRecorder')) {
  source = source.replace(
    "const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0);",
    "const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0),gmVoiceRecorder=useRef<MediaRecorder|null>(null),gmVoiceChunks=useRef<Blob[]>([]);"
  );
  const voiceFn = `async function toggleVoice(){if(!active||!socket?.connected){setSocketError('Realtime connection is not connected. Reconnecting…');socket?.connect();return}if(gmVoiceRecorder.current){gmVoiceRecorder.current.stop();return}try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Voice messages are not supported by this browser.');const media=await navigator.mediaDevices.getUserMedia({audio:true});const preferred=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'';const recorder=new MediaRecorder(media,preferred?{mimeType:preferred}:undefined);gmVoiceChunks.current=[];gmVoiceRecorder.current=recorder;recorder.ondataavailable=e=>{if(e.data.size)gmVoiceChunks.current.push(e.data)};recorder.onstop=async()=>{media.getTracks().forEach(t=>t.stop());gmVoiceRecorder.current=null;const blob=new Blob(gmVoiceChunks.current,{type:recorder.mimeType||'audio/webm'});gmVoiceChunks.current=[];if(blob.size<1000){setSocketError('Voice message is too short. Hold the microphone for a moment and try again.');return}try{setSocketError('Uploading voice message…');const file=new File([blob],\`voice-message-\${Date.now()}.webm\`,{type:blob.type||'audio/webm'});const up=await api.upload(file);socket.emit('message:send',{conversationId:active.id,body:'🎙️ Voice message',type:'voice',attachmentUrl:up.url,attachmentName:file.name,attachmentMime:file.type,attachmentSize:file.size,replyToId:reply?.id||null,clientId:crypto.randomUUID()});setReply(null);setSocketError('')}catch(e:any){setSocketError(e.message||'Unable to send voice message.')}};recorder.start();setSocketError('Recording voice message… click the microphone again to send');}catch(e:any){setSocketError(e.message||'Unable to start voice recording.')}}`;
  source = source.replace('function send(){', voiceFn+'function send(){');
  source = source.replace(
    '<button className="icon-btn" title="Attach file"onClick={()=>fileRef.current?.click()}><Paperclip size={19}/></button>',
    '<button className="icon-btn" title="Attach file"onClick={()=>fileRef.current?.click()}><Paperclip size={19}/></button><button className="icon-btn" title="Voice message" onClick={toggleVoice}>{gmVoiceRecorder.current?<span>⏹️</span>:<span>🎙️</span>}</button>'
  );
}

// Render uploaded audio as an actual player in message bubbles.
if (!source.includes('gm-audio-player')) {
  source = source.replace(
    /(<div className=\{`bubble \$\{message\.deletedAt\?'deleted':''\}`\}>)/,
    "$1{message.attachmentUrl&&message.attachmentMime?.startsWith('audio/')&&<audio className=\"gm-audio-player\" controls preload=\"metadata\" src={message.attachmentUrl}/>}"
  );
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('Global Messenger: applied voice-message patch and removed Smart Assist.');
}
