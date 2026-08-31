import { installEnhancements } from './enhancements';
let ctx:AudioContext|null=null;let ringtoneTimer:number|undefined;
function audio(){if(!ctx)ctx=new AudioContext();if(ctx.state==='suspended')void ctx.resume();return ctx}
function tone(freq:number,duration=.12,volume=.035){try{const c=audio(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+duration)}catch{}}
export function enableSounds(){try{const c=audio();if(c.state==='suspended')void c.resume();tone(760,.04,.012)}catch{}}
export function messagePing(){enableSounds();tone(880,.09);setTimeout(()=>tone(1175,.12),80)}
export function typingTick(){enableSounds();tone(520,.055,.024)}
export function stopRingtone(){if(ringtoneTimer)window.clearInterval(ringtoneTimer);ringtoneTimer=undefined}
export function startRingtone(video=false){enableSounds();stopRingtone();const play=()=>{tone(video?660:540,.25,.055);setTimeout(()=>tone(video?880:680,.3,.055),280)};play();ringtoneTimer=window.setInterval(play,1800)}
if(typeof document!=='undefined'){const unlock=()=>enableSounds();document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock,{passive:true});queueMicrotask(()=>installEnhancements())}
