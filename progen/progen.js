(() => {
  'use strict';

  const accessButton = document.querySelector('#access-button');
  const passwordPanel = document.querySelector('#password-panel');
  const passwordInput = document.querySelector('#password');
  const unlockButton = document.querySelector('#unlock-button');
  const actionPanel = document.querySelector('#action-panel');
  const message = document.querySelector('#message');

  function showMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle('success', success);
  }

  accessButton.addEventListener('click', () => {
    accessButton.hidden = true;
    passwordPanel.hidden = false;
    passwordInput.focus();
  });

  async function verifyPassword() {
  function revealActions() {
    if (!passwordInput.value) {
      showMessage('Enter your access password to continue.');
      passwordInput.focus();
      return;
    }

    unlockButton.disabled = true;
    showMessage('Verifying password…', true);
    try {
      const response = await requestAccess('verify');
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Password verification failed.');
      }
      passwordPanel.hidden = true;
      actionPanel.hidden = false;
      showMessage('Password verified. Choose how to receive the script.', true);
    } catch (error) {
      showMessage(error.message);
      passwordInput.select();
    } finally {
      unlockButton.disabled = false;
    }
  }

  function requestAccess(action) {
    return fetch('/api/progen-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value, action })
    });
  }

  unlockButton.addEventListener('click', verifyPassword);
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') verifyPassword();
    passwordPanel.hidden = true;
    actionPanel.hidden = false;
    showMessage('Choose how you want to receive the script.', true);
  }

  unlockButton.addEventListener('click', revealActions);
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') revealActions();
  });

  actionPanel.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    button.disabled = true;
    showMessage(action === 'copy' ? 'Preparing secure copy…' : 'Preparing secure download…', true);

    try {
      const response = await requestAccess(action);
      const response = await fetch('/api/progen-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.value, action })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Access request failed.');
      }

      if (action === 'copy') {
        const result = await response.json();
        await navigator.clipboard.writeText(result.script);
        showMessage('Script copied to your clipboard.', true);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'progen-turbo.user.js';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showMessage('Your download has started.', true);
      }
    } catch (error) {
      showMessage(error.message);
      if (error.message === 'Incorrect password.') {
        actionPanel.hidden = true;
        passwordPanel.hidden = false;
        passwordInput.select();
      }
    } finally {
      button.disabled = false;
    }
  });
})();
