(() => {
  try {
    const params = new URLSearchParams(location.search);
    const title = params.get('title') || '';
    const text = params.get('text') || '';
    const url = params.get('url') || '';
    if (!title && !text && !url) return;

    const payload = [title, text, url].filter(Boolean).join('\n').trim();
    if (!payload) return;

    const apply = () => {
      const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]'));
      const target = candidates.find(el => {
        const node = el;
        return !node.closest('[role="dialog"]') && node.offsetParent !== null;
      });
      if (!target) return false;

      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'value')?.set;
        setter?.call(target, payload);
      } else {
        target.textContent = payload;
      }
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: payload }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      target.focus();
      return true;
    };

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (apply() || attempts >= 30) window.clearInterval(timer);
    }, 250);

    window.history.replaceState({}, document.title, location.pathname || '/');
  } catch (error) {
    console.warn('Global Messenger share target unavailable', error);
  }
})();
