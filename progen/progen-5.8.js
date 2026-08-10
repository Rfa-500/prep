(() => {
  'use strict';

  const gate = document.querySelector('#pt-gate');
  const form = document.querySelector('#pt-password-form');
  const password = document.querySelector('#pt-password');
  const verify = document.querySelector('#pt-verify');
  const actions = document.querySelector('#pt-actions');
  const message = document.querySelector('#pt-message');

  function showMessage(text, success = false) {
    message.textContent = text;
    message.classList.toggle('pt-success', success);
  }

  async function request(action) {
    const response = await fetch('/api/progen-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value, action })
    });
    return response;
  }

  async function readJson(response) {
    const text = await response.text();
    let result = {};
    try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }
    if (!response.ok) throw new Error(result.error || `Server error ${response.status}.`);
    return result;
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

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!password.value) { showMessage('Enter your access password.'); password.focus(); return; }
    verify.disabled = true;
    showMessage('Verifying…', true);
    try {
      await readJson(await request('verify'));
      gate.hidden = true;
      actions.hidden = false;
      showMessage('Password verified.', true);
    } catch (error) {
      actions.hidden = true;
      gate.hidden = false;
      gate.open = true;
      showMessage(error.message);
      password.select();
    } finally {
      verify.disabled = false;
    }
  });

  actions.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    button.disabled = true;
    showMessage(action === 'copy' ? 'Preparing copy…' : 'Preparing download…', true);
    try {
      const response = await request(action);
      if (action === 'copy') {
        const result = await readJson(response);
        await copyText(result.script);
        showMessage('Script copied.', true);
      } else {
        if (!response.ok) await readJson(response);
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = 'progen-turbo.user.js';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showMessage('Download started.', true);
      }
    } catch (error) {
      showMessage(error.message);
      if (error.message === 'Incorrect password.') {
        actions.hidden = true;
        gate.hidden = false;
        gate.open = true;
        password.select();
      }
    } finally {
      button.disabled = false;
    }
  });
})();
