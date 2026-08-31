import fs from 'node:fs';

const path = 'apps/web/src/main.tsx';
let s = fs.readFileSync(path, 'utf8');

// Keep the previous conversation rendered while the next conversation loads.
if (!s.includes('[conversationLoading,setConversationLoading]')) {
  s = s.replace(
    '[socketError,setSocketError]=useState(\'\'),[presence,setPresence]=useState<Record<string,boolean>>({});',
    '[socketError,setSocketError]=useState(\'\'),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false);'
  );
}

const oldEffect = "useEffect(()=>{if(!active||!socket)return;const id=active.id;const requestId=++messageRequest.current;setMessages([]);setOtherTyping(false);setMenu(null);setReaction(null);setReply(null);setEditing(null);setEmojiOpen(false);socket.emit('conversation:join',id);api.messages(id).then(data=>{if(requestId!==messageRequest.current||active?.id!==id)return;setMessages(Array.isArray(data)?data.filter(m=>m?.conversationId===id):[])}).catch(e=>{if(requestId===messageRequest.current&&active?.id===id)setSocketError(e.message||'Unable to load messages')});api.read(id).catch(()=>{});setMobile(true);return()=>{if(socket.connected)socket.emit('conversation:leave',id)}},[active?.id,socket]);";
const newEffect = "useEffect(()=>{if(!active||!socket)return;const id=String(active.id);const requestId=++messageRequest.current;let cancelled=false;setConversationLoading(true);setOtherTyping(false);setMenu(null);setReaction(null);setReply(null);setEditing(null);setEmojiOpen(false);if(socket.connected)socket.emit('conversation:join',id);api.messages(id).then(data=>{if(cancelled||requestId!==messageRequest.current)return;const next=Array.isArray(data)?data.filter(m=>m?.conversationId===id):[];setMessages(next);setSocketError('')}).catch(e=>{if(cancelled||requestId!==messageRequest.current)return;setSocketError(e.message||'Unable to load messages')}).finally(()=>{if(!cancelled&&requestId===messageRequest.current)setConversationLoading(false)});api.read(id).catch(()=>{});setMobile(true);return()=>{cancelled=true;if(socket.connected)socket.emit('conversation:leave',id)}},[active?.id,socket]);";
if (s.includes(oldEffect)) s = s.replace(oldEffect, newEffect);

// Add a loading layer instead of replacing the whole conversation with a blank state.
const oldMessages = '<div className="messages"><div className="day"><span>Messages</span></div>';
const newMessages = '<div className={`messages ${conversationLoading?\'loading-messages\':\'\'}`}><div className="day"><span>{conversationLoading?\'Loading messages…\':\'Messages\'}</span></div>';
if (s.includes(oldMessages) && !s.includes('conversationLoading?\'Loading messages…\'')) s = s.replace(oldMessages, newMessages);

fs.writeFileSync(path, s);
console.log('[chat-stability] conversation switching hardening applied');
