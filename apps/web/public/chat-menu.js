(() => {
  if (document.querySelector('script[data-gm-modern-chat-menu]')) return;
  const script = document.createElement('script');
  script.src = '/chat-modern-menu.js?v=20260902';
  script.dataset.gmModernChatMenu = '1';
  document.body.appendChild(script);
})();
