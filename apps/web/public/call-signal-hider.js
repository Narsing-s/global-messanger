(() => {
  'use strict';
  const PREFIX = '__GM_CALL__';
  const hide = () => document.querySelectorAll('.message-row,.message-bubble,.bubble,.bubble-row').forEach(el => {
    if ((el.textContent || '').includes(PREFIX)) el.style.display = 'none';
  });
  new MutationObserver(hide).observe(document.body, { childList: true, subtree: true });
  setInterval(hide, 1500);
})();
