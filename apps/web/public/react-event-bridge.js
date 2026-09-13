(() => {
  'use strict';
  // React dispatches feature events on window; the legacy/advanced feature modules
  // listen on document. Keep the event boundary explicit without touching the UI DOM.
  window.addEventListener('gm:options', () => {
    document.dispatchEvent(new CustomEvent('gm:open-advanced-center'));
  });
})();
