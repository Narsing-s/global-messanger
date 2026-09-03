import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Smart Assist is intentionally removed: keep the messenger core key-free and avoid a broken AI button.
source = source.replace(/,Sparkles(?=,)/g, '');
source = source.replace(/,\[aiLoading,setAiLoading\]=useState\(false\)/g, '');

// Remove aiAssist with brace matching instead of a regex because main.tsx is minified to one long line
// and the function itself contains nested braces.
const aiStart = source.indexOf('async function aiAssist(){');
if (aiStart >= 0) {
  const open = source.indexOf('{', aiStart);
  let depth = 0;
  let close = -1;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        close = i + 1;
        break;
      }
    }
  }
  if (close < 0) throw new Error('Global Messenger: could not safely remove Smart Assist function.');
  source = source.slice(0, aiStart) + source.slice(close);
}

// Remove the Smart Assist button wherever it appears in the minified source.
const smartButtonStart = source.indexOf('<button className="icon-btn" title="Smart Assist"');
if (smartButtonStart >= 0) {
  const smartButtonEnd = source.indexOf('</button>', smartButtonStart);
  if (smartButtonEnd < 0) throw new Error('Global Messenger: could not safely remove Smart Assist button.');
  source = source.slice(0, smartButtonStart) + source.slice(smartButtonEnd + '</button>'.length);
}

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
