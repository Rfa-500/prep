(() => {
  'use strict';

  const PASSWORD = 'testy1';
  const SCRIPT_URL = 'https://pastebin.com/raw/s9XsfFX5';

  const accessButton = document.querySelector('#access');
  const passwordForm = document.querySelector('#password-form');
  const passwordInput = document.querySelector('#password');
  const copyButton = document.querySelector('#copy');
  const message = document.querySelector('#message');

  function setMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle('success', success);
  }

  async function writeToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  accessButton.addEventListener('click', () => {
    accessButton.hidden = true;
    passwordForm.hidden = false;
    passwordInput.focus();
  });

  passwordForm.addEventListener('submit', event => {
    event.preventDefault();

    if (passwordInput.value !== PASSWORD) {
      setMessage('Incorrect password.');
      passwordInput.select();
      return;
    }

    passwordForm.hidden = true;
    copyButton.hidden = false;
    setMessage('Access granted.', true);
  });

  copyButton.addEventListener('click', async () => {
    copyButton.disabled = true;
    setMessage('Copying script…', true);

    try {
      const response = await fetch(SCRIPT_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Script request returned ${response.status}.`);
      await writeToClipboard(await response.text());
      setMessage('Script copied to your clipboard.', true);
    } catch (error) {
      setMessage(`Could not copy the script: ${error.message}`);
    } finally {
      copyButton.disabled = false;
    }
  });
})();
