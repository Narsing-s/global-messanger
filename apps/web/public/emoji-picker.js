(() => {
  'use strict';
  const ROOT_ID = 'gm-full-emoji-picker';
  const input = () => document.querySelector('.composer input:not([type="file"])');

  function emojiSet() {
    const out = [];
    // Unicode emoji-presentation characters. This automatically follows the
    // browser's Unicode emoji data instead of maintaining a tiny hardcoded list.
    try {
      const emoji = /^\p{Emoji_Presentation}$/u;
      const extended = /^\p{Extended_Pictographic}$/u;
      for (let cp = 0; cp <= 0x1FAFF; cp++) {
        const ch = String.fromCodePoint(cp);
        if (emoji.test(ch) || extended.test(ch) && /[\u2600-\u27BF\u{1F000}-\u{1FAFF}]/u.test(ch)) out.push(ch);
      }
    } catch {
      out.push(...'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 🫠 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🤑 🤠'.split(' '));
    }

    // Regional-indicator flags.
    for (let a = 0x1F1E6; a <= 0x1F1FF; a++) {
      for (let b = 0x1F1E6; b <= 0x1F1FF; b++) {
        out.push(String.fromCodePoint(a, b));
      }
    }

    // Common keycap sequences.
    for (const k of ['0','1','2','3','4','5','6','7','8','9','#','*']) out.push(k + '\uFE0F\u20E3');

    // Skin-tone variants for common people/gesture emojis.
    const tones = ['🏻','🏼','🏽','🏾','🏿'];
    const people = ['👍','👎','👏','🙌','🙏','🤝','👋','✋','🤚','🖐️','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✍️','💪','🫶','🙋','🙆','🙅','🤷','🤦','💁'];
    for (const p of people) for (const t of tones) out.push(p + t);

    // High-value ZWJ sequences supported across modern emoji fonts.
    out.push(...[
      '👨‍💻','👩‍💻','🧑‍💻','👨‍🚀','👩‍🚀','🧑‍🚀','👨‍🍳','👩‍🍳','🧑‍🍳','👨‍🎓','👩‍🎓','🧑‍🎓',
      '👨‍🏫','👩‍🏫','🧑‍🏫','👨‍⚕️','👩‍⚕️','🧑‍⚕️','👨‍🎨','👩‍🎨','🧑‍🎨','👨‍🚒','👩‍🚒','🧑‍🚒',
      '👨‍🔧','👩‍🔧','🧑‍🔧','👨‍⚖️','👩‍⚖️','🧑‍⚖️','👨‍🌾','👩‍🌾','🧑‍🌾','👨‍🔬','👩‍🔬','🧑‍🔬',
      '👨‍❤️‍👨','👩‍❤️‍👩','👩‍❤️‍👨','❤️‍🔥','❤️‍🩹','❤️‍🩵','❤️‍🩷','❤️‍🧡','❤️‍💛','❤️‍💚','❤️‍💙','❤️‍💜','❤️‍🤎','❤️‍🖤','❤️‍🤍',
      '🏳️‍🌈','🏳️‍⚧️','☠️','⚡','☀️','⭐','🌟','✨','🔥','🎉','🎊','💯','💫','💥','💦','💨','🕊️','👁️‍🗨️'
    ]);
    return [...new Set(out)];
  }

  const ALL = emojiSet();
  const groups = [
    ['All', ALL],
    ['Smileys', ALL.filter(e => /[\u{1F600}-\u{1F64F}]/u.test(e))],
    ['People', ALL.filter(e => /[\u{1F440}-\u{1F4FF}\u{1F900}-\u{1F9FF}]/u.test(e))],
    ['Animals', ALL.filter(e => /[\u{1F400}-\u{1F43F}]/u.test(e))],
    ['Food', ALL.filter(e => /[\u{1F32D}-\u{1F37F}]/u.test(e))],
    ['Travel', ALL.filter(e => /[\u{1F680}-\u{1F6FF}]/u.test(e))],
    ['Objects', ALL.filter(e => /[\u{1F4A0}-\u{1F5FF}]/u.test(e))],
    ['Symbols', ALL.filter(e => /[\u{2600}-\u{27BF}\u{1F300}-\u{1F31F}]/u.test(e))]
  ];

  function insert(value) {
    const el = input();
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, (el.value || '') + value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  function close() { document.getElementById(ROOT_ID)?.remove(); }

  function render(list) {
    const grid = document.querySelector('#gm-full-emoji-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const e of list) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gm-full-emoji'; b.textContent = e;
      b.title = e; b.onclick = () => insert(e);
      frag.appendChild(b);
    }
    grid.appendChild(frag);
  }

  function open() {
    close();
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `<div class="gm-full-emoji-card"><div class="gm-full-emoji-head"><strong>😊 Emojis</strong><button type="button" data-close>×</button></div><input class="gm-full-emoji-search" placeholder="Search emojis or paste one…" aria-label="Search emojis"><div class="gm-full-emoji-tabs"></div><div id="gm-full-emoji-grid"></div></div>`;
    document.body.appendChild(root);
    root.querySelector('[data-close]').onclick = close;
    root.addEventListener('click', e => { if (e.target === root) close(); });
    const tabs = root.querySelector('.gm-full-emoji-tabs');
    groups.forEach(([name, list], i) => {
      const b = document.createElement('button'); b.type='button'; b.textContent=name; b.className=i===0?'active':'';
      b.onclick=()=>{root.querySelectorAll('.gm-full-emoji-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(list)};
      tabs.appendChild(b);
    });
    root.querySelector('.gm-full-emoji-search').addEventListener('input', e => {
      const q = e.target.value.trim();
      render(q ? ALL.filter(x => x.includes(q)) : ALL);
    });
    render(ALL);
  }

  function styles() {
    if (document.getElementById('gm-full-emoji-style')) return;
    const s = document.createElement('style'); s.id='gm-full-emoji-style';
    s.textContent=`#gm-full-emoji-picker{position:fixed;inset:0;z-index:100010;background:rgba(2,6,23,.35);display:grid;place-items:end center;padding:0 16px 86px;font-family:system-ui} .gm-full-emoji-card{width:min(520px,96vw);height:min(560px,72vh);background:#fff;border:1px solid #e5e9f2;border-radius:22px;box-shadow:0 25px 90px #0004;display:flex;flex-direction:column;overflow:hidden} .gm-full-emoji-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #edf0f5}.gm-full-emoji-head button{border:0;background:transparent;font-size:24px;cursor:pointer;color:#697386}.gm-full-emoji-search{margin:10px 12px;padding:10px 12px;border:1px solid #dce2ec;border-radius:12px;outline:none}.gm-full-emoji-tabs{display:flex;gap:5px;overflow:auto;padding:0 10px 8px}.gm-full-emoji-tabs button{white-space:nowrap;border:0;background:#f2f4f8;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}.gm-full-emoji-tabs button.active{background:#536dfe;color:#fff}.gm-full-emoji-card #gm-full-emoji-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;padding:8px 10px;overflow:auto}.gm-full-emoji{border:0;background:transparent;border-radius:9px;font-size:25px;line-height:1;padding:7px 2px;cursor:pointer}.gm-full-emoji:hover{background:#eef1ff;transform:scale(1.08)}@media(max-width:600px){.gm-full-emoji-card{height:min(560px,78vh)}.gm-full-emoji-card #gm-full-emoji-grid{grid-template-columns:repeat(8,1fr)}.gm-full-emoji{font-size:24px}}`;
    document.head.appendChild(s);
  }

  function install() {
    styles();
    document.addEventListener('click', e => {
      const t = e.target.closest?.('.emoji-wrap button');
      if (!t) return;
      e.preventDefault(); e.stopImmediatePropagation(); open();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
