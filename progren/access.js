(() => {
  'use strict';

  const PASSWORD = 'testy1';
  const SCRIPT_URL = 'https://pastebin.com/raw/s9XsfFX5';
  const accessButton = document.querySelector('#access');
  const passwordInput = document.querySelector('#password');
  const copyButton = document.querySelector('#copy');
  const message = document.querySelector('#message');

  function showMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle('success', success);
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

  accessButton.addEventListener('click', () => {
    accessButton.hidden = true;
    passwordInput.hidden = false;
    passwordInput.focus();
  });

  passwordInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    if (passwordInput.value !== PASSWORD) {
      showMessage('Incorrect password.');
      passwordInput.select();
      return;
    }
    passwordInput.hidden = true;
    copyButton.hidden = false;
    showMessage('Access granted.', true);
  });

  copyButton.addEventListener('click', async () => {
    copyButton.disabled = true;
    showMessage('Copying script…', true);
    try {
      const response = await fetch(SCRIPT_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Pastebin returned ${response.status}.`);
      await copyText(await response.text());
      showMessage('Script copied to your clipboard.', true);
    } catch (error) {
      showMessage(`Could not copy the script: ${error.message}`);
    } finally {
      copyButton.disabled = false;
    }
  });
})();
