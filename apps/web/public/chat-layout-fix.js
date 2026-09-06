(() => {
  'use strict';

  const STYLE_ID = 'gm-chat-layout-fix-v1';

  function installChatLayoutFix() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        html, body, #root {
          height: 100%;
          min-height: 100%;
        }

        .conversation,
        .conversation.show-mobile {
          height: 100%;
          min-height: 0;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden;
        }

        .conversation > .topbar {
          flex: 0 0 auto !important;
          order: 1 !important;
        }

        .conversation > .messages {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          height: auto !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          order: 2 !important;
        }

        .conversation > .composer-wrap {
          flex: 0 0 auto !important;
          min-height: 0 !important;
          height: auto !important;
          margin-top: auto !important;
          position: relative !important;
          inset: auto !important;
          order: 3 !important;
          z-index: 5 !important;
          visibility: visible !important;
          transform: none !important;
        }

        .conversation > .composer-wrap .composer {
          position: relative !important;
          inset: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  installChatLayoutFix();
  window.addEventListener('DOMContentLoaded', installChatLayoutFix, { once: true });
})();
