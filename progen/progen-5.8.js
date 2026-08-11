(() => {
  'use strict';

  const PASSWORD = 'testy1';
  const SCRIPT_URL = 'https://pastebin.com/s9XsfFX5';
  const SCRIPT_RAW_URL = 'https://pastebin.com/raw/s9XsfFX5';
  const gate = document.querySelector('#pt-gate');
  const form = document.querySelector('#pt-password-form');
  const password = document.querySelector('#pt-password');
  const actions = document.querySelector('#pt-actions');
  const copyButton = document.querySelector('#pt-copy');
  const message = document.querySelector('#pt-message');

  function showMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle('pt-success', success);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  gate.addEventListener('toggle', () => {
    if (gate.open) window.setTimeout(() => password.focus(), 0);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (password.value !== PASSWORD) {
      actions.hidden = true;
      showMessage('Incorrect password.');
      password.select();
      return;
    }
    gate.hidden = true;
    actions.hidden = false;
    showMessage('Access granted.', true);
  });

  copyButton.addEventListener('click', async () => {
    try {
      const response = await fetch(SCRIPT_RAW_URL);
      if (!response.ok) throw new Error('SCRIPT_UNAVAILABLE');
      await copyText(await response.text());
      showMessage('Script copied.', true);
    } catch {
      await copyText(SCRIPT_URL).catch(() => {});
      showMessage('Pastebin blocked direct copying. The script link was copied; use Open Script.');
    }
  });
})();
