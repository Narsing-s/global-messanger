(() => {
  const API = 'https://global-messanger-backend.onrender.com';
  const LANGS = [
    ['auto','🌐 Auto'],['en','English'],['te','తెలుగు'],['hi','हिन्दी'],['ta','தமிழ்'],['kn','ಕನ್ನಡ'],['ml','മലയാളം'],['bn','বাংলা'],['mr','मराठी'],['gu','ગુજરાતી'],['pa','ਪੰਜਾਬੀ'],['ur','اردو'],['ar','العربية'],['fa','فارسی'],['he','עברית'],['zh-CN','简体中文'],['zh-TW','繁體中文'],['ja','日本語'],['ko','한국어'],['th','ไทย'],['vi','Tiếng Việt'],['id','Bahasa Indonesia'],['ms','Bahasa Melayu'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['pt','Português'],['ru','Русский'],['uk','Українська'],['tr','Türkçe'],['pl','Polski'],['nl','Nederlands'],['sv','Svenska'],['no','Norsk'],['da','Dansk'],['fi','Suomi'],['el','Ελληνικά'],['ro','Română']
  ];
  const stored = () => localStorage.getItem('gm_message_language') || 'auto';
  const effectiveLang = () => stored() === 'auto' ? (navigator.language || 'en').toLowerCase() : stored();
  const setReactValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const localImprove = (text) => {
    let s = String(text || '').replace(/[ \t]+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
    if (!s) return s;
    s = s.replace(/([!?.,])\1{2,}/g, '$1');
    if (/^[A-Za-z]/.test(s)) s = s.charAt(0).toUpperCase() + s.slice(1);
    return s;
  };
  const languageSelect = () => {
    let input = document.querySelector('.composer input:not([type=file])');
    if (!input) return;
    input.setAttribute('spellcheck', 'true');
    input.setAttribute('autocorrect', 'on');
    input.setAttribute('autocapitalize', 'sentences');
    input.setAttribute('translate', 'yes');
    input.lang = effectiveLang();
    let wrap = document.getElementById('gm-language-tools');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.id = 'gm-language-tools';
      wrap.style.cssText = 'display:inline-flex;align-items:center;margin-left:4px;';
      const select = document.createElement('select');
      select.id = 'gm-message-language';
      select.title = 'Message language and spell-check language';
      select.setAttribute('aria-label', 'Message language');
      select.style.cssText = 'max-width:92px;border:0;background:transparent;color:inherit;font:12px system-ui;outline:none;cursor:pointer;';
      LANGS.forEach(([value,label]) => { const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o); });
      select.value = stored();
      select.onchange = () => { localStorage.setItem('gm_message_language', select.value); input = document.querySelector('.composer input:not([type=file])'); if(input){input.lang=effectiveLang();input.focus();} };
      wrap.appendChild(select);
      const send = document.querySelector('.composer .send');
      if (send?.parentElement) send.parentElement.insertBefore(wrap, send);
    } else {
      const select = wrap.querySelector('select');
      if (select && select.value !== stored()) select.value = stored();
    }
  };
  const smartAssist = async (button) => {
    const input = document.querySelector('.composer input:not([type=file])');
    if (!input || !input.value.trim()) { input?.focus(); return; }
    const draft = input.value.trim();
    const lang = effectiveLang();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.style.opacity = '0.65';
    button.title = 'Smart Assist is working…';
    try {
      const token = localStorage.getItem('gm_token') || '';
      const res = await fetch(`${API}/api/ai/assist`, { method:'POST', headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, body:JSON.stringify({ mode:'smart', targetLanguage:lang, prompt:`Improve this message for clarity, grammar, spelling, warmth, and natural tone. Preserve the exact meaning. Do not add facts. Keep the answer in the same language/script as the draft. Return only the improved message.`, context:`Draft: ${draft}`}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('AI unavailable');
      setReactValue(input, data.answer.trim());
    } catch {
      setReactValue(input, localImprove(draft));
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.style.opacity = '';
      button.title = 'Smart Assist';
    }
  };
  const scan = () => {
    languageSelect();
    const buttons = document.querySelectorAll('.composer button[title="Smart Assist"]');
    buttons.forEach(button => {
      if (button.dataset.gmSmartBound === '1') return;
      button.dataset.gmSmartBound = '1';
      button.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); void smartAssist(button); }, true);
    });
  };
  const observer = new MutationObserver(scan);
  const start = () => { scan(); observer.observe(document.body, {childList:true,subtree:true}); setInterval(scan,1000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();