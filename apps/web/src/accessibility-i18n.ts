const translations: Record<string, Record<string,string>> = {
  en:{menu:'Menu',search:'Search',send:'Send',close:'Close',settings:'Settings'},
  te:{menu:'మెను',search:'వెతుకు',send:'పంపు',close:'మూసివేయి',settings:'సెట్టింగ్స్'},
  hi:{menu:'मेनू',search:'खोजें',send:'भेजें',close:'बंद करें',settings:'सेटिंग्स'},
  ar:{menu:'القائمة',search:'بحث',send:'إرسال',close:'إغلاق',settings:'الإعدادات'}
};
const localeKey=()=>localStorage.getItem('gm_locale')||navigator.language.split('-')[0]||'en';
export const t=(key:string)=>translations[localeKey()]?.[key]??translations.en[key]??key;
export function initAccessibility(){
  const locale=localeKey(); const rtl=['ar','fa','he','ur'].includes(locale);
  document.documentElement.lang=locale; document.documentElement.dir=rtl?'rtl':'ltr';
  document.documentElement.dataset.rtl=rtl?'true':'false';
  if(!document.getElementById('gm-skip-link')){const a=document.createElement('a');a.id='gm-skip-link';a.href='#root';a.textContent='Skip to main content';Object.assign(a.style,{position:'fixed',left:'8px',top:'8px',zIndex:'99999',padding:'10px',background:'CanvasText',color:'Canvas'});a.addEventListener('focus',()=>a.style.transform='translateY(0)');a.addEventListener('blur',()=>a.style.transform='translateY(-200%)');a.style.transform='translateY(-200%)';document.body.prepend(a);}
  if(!document.getElementById('gm-a11y-style')){const style=document.createElement('style');style.id='gm-a11y-style';style.textContent=`*:focus-visible{outline:3px solid currentColor;outline-offset:2px}button,[role=button],a,input,textarea,select{touch-action:manipulation}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}[dir=rtl]{text-align:right}`;document.head.appendChild(style);}
  const observer=new MutationObserver(()=>document.querySelectorAll('img:not([alt])').forEach((img:any)=>img.alt=''));observer.observe(document.body,{subtree:true,childList:true});
}
initAccessibility();
