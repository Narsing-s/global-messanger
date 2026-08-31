(() => {
  'use strict';
  const ROOT_ID = 'gm-full-emoji-picker';
  const input = () => document.querySelector('.composer input:not([type="file"])');

  // Keep emoji ordering stable and familiar instead of relying on Unicode
  // code-point order. This gives the picker a messenger-style category flow.
  const CATEGORIES = [
    ['Smileys', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 🫠 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🤑 🤠 🤡 🥸 😈 👿 👹 👺 💀 ☠️ 👻 👽 🤖 💩'.split(' ')],
    ['People', '👋 🤚 🖐️ ✋ 🖖 👌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✍️ 👏 🙌 👐 🤲 🙏 💪 🫶 ❤️‍🩹 💅 🤳 💇 💆 🧖 🧘 🧍 🧎 🚶 🏃 💃 🕺 🕴️ 👯 🧖‍♀️ 🧑‍🤝‍🧑 👨‍👩‍👧 👨‍👩‍👧‍👦 👶 🧒 👦 👧 🧑 👱 👨 👩 🧔 🧓 👴 👵'.split(' ')],
    ['Animals', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦀 🐠 🐟 🐡 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦏 🦛 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐈 🐓 🦃 🕊️ 🐇 🐿️ 🦔'.split(' ')],
    ['Food', '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🌰 🍞 🥐 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍚 🍙 🍘 🍥 🥠 🥮 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🫖 🥤 🧃 🧋 🥛 🍵'.split(' ')],
    ['Activities', '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🪁 🏓 🏸 🏒 🥅 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🏌️ 🏇 🧘 🧗 🏄 🏊 🤽 🚣 🧜 🎮 🕹️ 🎲 ♟️ 🎯 🎳 🎰 🧩 🎨 🎭 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻'.split(' ')],
    ['Travel', '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🚨 🚔 🚘 🚖 ✈️ 🛫 🛬 🛩️ 🚁 🚀 🛸 🚢 ⛵ 🚤 🛥️ 🚂 🚆 🚇 🚊 🚉 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 🏖️ 🏝️ 🏜️ 🏕️ ⛺ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 🏭 ⛪ 🕌 🛕 🗿 🗺️ 🧭'.split(' ')],
    ['Objects', '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 💿 📷 📸 📹 🎥 📺 📻 ☎️ 📞 🔋 🔌 💡 🔦 🕯️ 🧯 🛒 💰 💳 💎 🔑 🔒 🔓 🔐 🧰 🔨 ⚒️ 🛠️ ⚔️ 🛡️ 🔧 🔩 ⚙️ 🧲 🧪 🧬 🔬 🔭 📡 💊 💉 🩹 📚 📖 📝 ✏️ 🖊️ 🖋️ 📌 📍 📎 ✂️ 📐 📏 🗑️ 📦 📫 📮 🗂️ 🗃️ 🗄️ 🧳 ☂️ 🧢 👓 🕶️ 👔 👕 👖 👗 👟 👞 👜 🎒 ☕ 🧸 🪄'.split(' ')],
    ['Symbols', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💯 💢 💥 💫 ✨ ⭐ 🌟 ⚡ 🔥 🎉 🎊 🎈 🎁 ✔️ ❌ ❗ ❓ ⁉️ ‼️ ⁠🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔶 🔷 🔸 🔹 🔺 🔻 💠 ♻️ ⚠️ 🚫 ⛔ 🔞 ☢️ ☣️ ⚜️ 🔱 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ☦️ 🛐'.split(' ')],
    ['Flags', '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇯🇵 🇰🇷 🇨🇳 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇧🇷 🇲🇽 🇦🇪 🇸🇬 🇸🇦 🇿🇦 🇷🇺 🇺🇦 🇳🇵 🇱🇰 🇳🇿 🇵🇰 🇧🇩'.split(' ')]
  ];

  const seen = new Set();
  const orderedCategories = CATEGORIES.map(([name, list]) => [
    name,
    list.filter(e => e && !seen.has(e) && (seen.add(e), true))
  ]);
  const ALL = orderedCategories.flatMap(([, list]) => list);
  const groups = [['All', ALL], ...orderedCategories];

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
    grid.replaceChildren();
    const frag = document.createDocumentFragment();
    for (const e of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gm-full-emoji';
      b.textContent = e;
      b.title = e;
      b.setAttribute('aria-label', `Insert ${e}`);
      b.onclick = () => insert(e);
      frag.appendChild(b);
    }
    grid.appendChild(frag);
  }

  function open() {
    close();
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = '<div class="gm-full-emoji-card"><div class="gm-full-emoji-head"><strong>😊 Emojis</strong><button type="button" data-close aria-label="Close emoji picker">×</button></div><input class="gm-full-emoji-search" placeholder="Search emojis or paste one…" aria-label="Search emojis"><div class="gm-full-emoji-tabs"></div><div id="gm-full-emoji-grid"></div></div>';
    document.body.appendChild(root);
    root.querySelector('[data-close]').onclick = close;
    root.addEventListener('click', e => { if (e.target === root) close(); });

    const tabs = root.querySelector('.gm-full-emoji-tabs');
    groups.forEach(([name, list], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.className = i === 0 ? 'active' : '';
      b.onclick = () => {
        root.querySelectorAll('.gm-full-emoji-tabs button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        render(list);
      };
      tabs.appendChild(b);
    });

    root.querySelector('.gm-full-emoji-search').addEventListener('input', e => {
      const q = e.target.value.trim();
      // Search preserves the same stable category order because ALL is ordered.
      render(q ? ALL.filter(x => x.includes(q)) : ALL);
    });
    render(ALL);
  }

  function styles() {
    if (document.getElementById('gm-full-emoji-style')) return;
    const s = document.createElement('style');
    s.id = 'gm-full-emoji-style';
    s.textContent = `#gm-full-emoji-picker{position:fixed;inset:0;z-index:100010;background:rgba(2,6,23,.35);display:grid;place-items:end center;padding:0 16px 86px;font-family:system-ui}.gm-full-emoji-card{width:min(520px,96vw);height:min(560px,72vh);background:#fff;border:1px solid #e5e9f2;border-radius:22px;box-shadow:0 25px 90px #0004;display:flex;flex-direction:column;overflow:hidden}.gm-full-emoji-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #edf0f5}.gm-full-emoji-head button{border:0;background:transparent;font-size:24px;cursor:pointer;color:#697386}.gm-full-emoji-search{margin:10px 12px;padding:10px 12px;border:1px solid #dce2ec;border-radius:12px;outline:none}.gm-full-emoji-tabs{display:flex;gap:5px;overflow:auto;padding:0 10px 8px;scrollbar-width:thin}.gm-full-emoji-tabs button{white-space:nowrap;border:0;background:#f2f4f8;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}.gm-full-emoji-tabs button.active{background:#536dfe;color:#fff}.gm-full-emoji-card #gm-full-emoji-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;padding:8px 10px;overflow:auto;align-content:start}.gm-full-emoji{border:0;background:transparent;border-radius:9px;font-size:25px;line-height:1;padding:7px 2px;cursor:pointer}.gm-full-emoji:hover{background:#eef1ff;transform:scale(1.08)}@media(max-width:600px){.gm-full-emoji-card{height:min(560px,78vh)}.gm-full-emoji-card #gm-full-emoji-grid{grid-template-columns:repeat(8,1fr)}.gm-full-emoji{font-size:24px}}`;
    document.head.appendChild(s);
  }

  function install() {
    styles();
    document.addEventListener('click', e => {
      const t = e.target.closest?.('.emoji-wrap button');
      if (!t) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
