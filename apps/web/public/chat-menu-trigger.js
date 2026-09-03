(() => {
  'use strict';
  // The modern menu exposes its UI through gm:options. This bridge connects
  // the real three-dots button to that event instead of relying on brittle
  // child-index selectors.
  const isMore = target => target instanceof Element && !!target.closest('.top-actions button[title="More options"], .top-actions button[aria-label="More options"]');
  document.addEventListener('click', event => {
    if (!isMore(event.target)) return;
    window.dispatchEvent(new CustomEvent('gm:options'));
  }, false);
})();
