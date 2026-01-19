let toastRoot;

export function ensureToastRoot() {
  if (!toastRoot) {
    toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      document.body.appendChild(toastRoot);
    }
  }
  return toastRoot;
}

export function toast(title, message, { timeout = 2500 } = {}) {
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => el.remove(), 220);
  }, timeout);
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.animation = 'fadeOut 0.2s ease forwards';
  setTimeout(() => modal.remove(), 220);
}

export function modal({ id, title, bodyHtml, buttons = [] }) {
  closeModal(id);
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = id;
  const btnHtml = buttons.map((b, i) => `<button data-idx="${i}">${b.label}</button>`).join('');
  m.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <div class="modal-body">${bodyHtml}</div>
      ${buttons.length ? `<div class="button-row">${btnHtml}</div>` : ''}
    </div>
  `;
  document.body.appendChild(m);
  const btns = m.querySelectorAll('button[data-idx]');
  btns.forEach((btn) => {
    const idx = Number(btn.getAttribute('data-idx'));
    btn.addEventListener('click', () => {
      const handler = buttons[idx]?.onClick;
      if (handler) handler();
    });
  });
  return m;
}

export function alertDialog(title, message, onOk) {
  const m = modal({
    id: 'dialog-modal',
    title,
    bodyHtml: `<p>${message}</p>`,
    buttons: [{
      label: 'OK',
      onClick: () => {
        closeModal('dialog-modal');
        if (onOk) onOk();
      }
    }]
  });
  return m;
}

export function confirmDialog(title, message, onYes) {
  modal({
    id: 'confirm-modal',
    title,
    bodyHtml: `<p>${message}</p>`,
    buttons: [
      { label: 'Cancel', onClick: () => closeModal('confirm-modal') },
      { label: 'OK', onClick: () => { closeModal('confirm-modal'); onYes?.(); } },
    ]
  });
}

export function pickFile({ accept = '.json,application/json' } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.remove();
      resolve(file || null);
    });
    input.click();
  });
}

export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
