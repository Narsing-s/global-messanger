(() => {
  const originalFetch = window.fetch.bind(window);

  function showSuccess(email) {
    if (document.getElementById('gm-registration-success')) return;

    const overlay = document.createElement('div');
    overlay.id = 'gm-registration-success';
    overlay.setAttribute('role', 'alertdialog');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:20px',
      'background:rgba(5,10,25,.58)', 'backdrop-filter:blur(5px)'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(440px,100%)', 'box-sizing:border-box', 'padding:28px',
      'border-radius:20px', 'background:#10182b', 'color:#fff',
      'border:1px solid rgba(255,255,255,.14)', 'box-shadow:0 24px 70px rgba(0,0,0,.4)',
      'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'text-align:center'
    ].join(';');

    const icon = document.createElement('div');
    icon.textContent = '✓';
    icon.style.cssText = 'width:58px;height:58px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#16a34a;color:white;font-size:32px;font-weight:800;';

    const title = document.createElement('h2');
    title.textContent = 'Account created successfully!';
    title.style.cssText = 'margin:0 0 10px;font-size:24px;';

    const message = document.createElement('p');
    message.textContent = email
      ? `Welcome to Global Messenger. A greetings email has been sent to ${email}.`
      : 'Welcome to Global Messenger. A greetings email has been sent to your registered email address.';
    message.style.cssText = 'margin:0 0 22px;line-height:1.55;color:#cbd5e1;font-size:15px;word-break:break-word;';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Go to Login';
    button.style.cssText = 'border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;cursor:pointer;';
    button.onclick = () => {
      localStorage.removeItem('gm_token');
      localStorage.removeItem('gm_user');
      window.location.href = '/?login=1';
    };

    card.append(icon, title, message, button);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const request = args[0];
      const requestUrl = typeof request === 'string' ? request : request?.url || '';
      if (requestUrl.includes('/api/auth/register-email') && response.ok) {
        let email = '';
        const init = args[1];
        if (init?.body && typeof init.body === 'string') {
          try { email = JSON.parse(init.body)?.email || ''; } catch {}
        }
        showSuccess(email);
      }
    } catch (error) {
      console.warn('[Global Messenger] registration success notification failed', error);
    }
    return response;
  };
})();
