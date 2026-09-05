(() => {
  'use strict';

  // Chat actions are handled centrally by chat-folders.js.
  // This script only keeps permanently deleted chats hidden after the UI refreshes.
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };

  const hideDeletedRows = () => {
    const deleted = read('gm_chat_deleted', []);
    document.querySelectorAll('.chat-list .chat-item[data-gm-conversation-id]').forEach(row => {
      if (deleted.includes(String(row.getAttribute('data-gm-conversation-id')))) row.style.display = 'none';
    });
  };

  const observer = new MutationObserver(hideDeletedRows);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('gm:chat-folders-refresh', hideDeletedRows);
  window.setInterval(hideDeletedRows, 1000);
  hideDeletedRows();
})();