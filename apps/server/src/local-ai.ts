type AssistMode = 'smart' | 'spell' | 'rewrite' | 'translate' | 'summarize';

const COMMON_FIXES: Record<string, string> = {
  teh: 'the', recieve: 'receive', seperate: 'separate', definately: 'definitely', occured: 'occurred', adress: 'address', becuase: 'because', langauge: 'language', recieveing: 'receiving', thier: 'their', dont: "don't", cant: "can't", wont: "won't", isnt: "isn't", didnt: "didn't", im: "I'm", ive: "I've", youre: "you're", thats: "that's", whats: "what's"
};

const LANG_NAMES: Record<string,string> = { en:'English', te:'Telugu', hi:'Hindi', ta:'Tamil', kn:'Kannada', ml:'Malayalam', bn:'Bengali', mr:'Marathi', gu:'Gujarati', pa:'Punjabi', ur:'Urdu', ar:'Arabic', zh:'Chinese', ja:'Japanese', ko:'Korean', es:'Spanish', fr:'French', de:'German', it:'Italian', pt:'Portuguese', ru:'Russian', tr:'Turkish' };

function spell(text:string){ return text.replace(/\b[A-Za-z']+\b/g, w => COMMON_FIXES[w.toLowerCase()] ?? w); }
function sentenceCase(text:string){ const s=spell(text.trim()).replace(/\s+/g,' '); return s ? s.charAt(0).toUpperCase()+s.slice(1).replace(/\s*([.!?])\s*/g,'$1 ') .trim() : s; }
function summarize(text:string){ const parts=text.split(/(?<=[.!?])\s+/).filter(Boolean); if(parts.length<=2)return sentenceCase(text); return parts.slice(0,2).join(' '); }

export function localAssist(prompt:string, context:string|undefined, mode:AssistMode='smart', target='en'){
 const input=prompt.trim();
 if(!input) return '';
 if(mode==='spell') return sentenceCase(input);
 if(mode==='rewrite') return sentenceCase(input);
 if(mode==='summarize') return summarize(input);
 if(mode==='translate') return `[${LANG_NAMES[target] ?? target}] ${input}`;
 // Key-free Smart Assist: useful deterministic writing assistance without external AI/API keys.
 if(/spell|correct|grammar/i.test(input)) return sentenceCase(input.replace(/^(please\s+)?(check|fix)\s+(my\s+)?(spelling|grammar)[:\s-]*/i,''));
 if(/summari[sz]e/i.test(input)) return summarize(input.replace(/^.*?summari[sz]e[:\s-]*/i,''));
 return sentenceCase(input);
}
