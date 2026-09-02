(() => {
  'use strict';

  // Chat rows are React buttons. Make them explicit non-submit buttons and
  // cancel any browser default action so switching chats never navigates or
  // reloads the page. React's existing onClick still handles setActive().
  const fixChatButtons = () => {
    document.querySelectorAll('.chat-item').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.type = 'button';
      button.setAttribute('data-gm-chat-switch', '1');
    });
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const chat = target.closest('.chat-item');
    if (!chat) return;
    event.preventDefault();
  }, true);

  const observer = new MutationObserver(fixChatButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  fixChatButtons();
})();
