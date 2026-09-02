(() => {
  const params = new URLSearchParams(window.location.search);
  const isWelcomeEmailLink = params.get('welcome') === '1';
  const loginEmail = params.get('loginEmail');

  // Only the "Open Global Messenger" button in the welcome email may prefill
  // the email/username field. Never prefill a password or credentials elsewhere.
  if (!isWelcomeEmailLink || !loginEmail) return;

  const fill = () => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const input = inputs.find(el => {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return type !== 'password' && !el.hidden && el.offsetParent !== null;
    });
    if (!input) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, loginEmail);
    else input.value = loginEmail;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    return true;
  };

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (fill() || attempts >= 40) clearInterval(timer);
  }, 100);
})();
