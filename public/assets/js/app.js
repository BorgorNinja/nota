import { ApiClient } from './api.js';
import { alertDialog, closeModal, toast } from './ui.js';
import { NoteManager } from './noteManager.js';

/* --- INTRO SEQUENCE --- */
function introSequence(onDone) {
  const introOverlay = document.getElementById('intro-overlay');
  const introTitle = document.getElementById('intro-title');
  if (!introOverlay || !introTitle) {
    onDone?.();
    return;
  }
  const titleText = 'Nota';
  let idx = 0;
  introTitle.textContent = '';

  (function typeWriter() {
    if (idx < titleText.length) {
      introTitle.textContent += titleText.charAt(idx);
      idx++;
      setTimeout(typeWriter, 260);
    } else {
      setTimeout(() => {
        introTitle.classList.add('slide-to-corner');
        setTimeout(() => {
          introOverlay.style.opacity = '0';
          setTimeout(() => {
            introOverlay.remove();
            onDone?.();
          }, 450);
        }, 1100);
      }, 700);
    }
  })();
}

function applyThemeFromPrefs() {
  const saved = localStorage.getItem('nota_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.body.dataset.theme = theme;
}

function toggleTheme() {
  const current = document.body.dataset.theme || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  localStorage.setItem('nota_theme', next);
  toast('Theme', next === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
}

function showLoginModal({ api, onSuccess }) {
  closeModal('login-modal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'login-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Login to Nota</h3>
      <input type="text" id="login_username" placeholder="Username" autocomplete="username">
      <input type="password" id="login_password" placeholder="Password" autocomplete="current-password">
      <div class="button-row">
        <button id="login_btn">Login</button>
        <button id="register_open">Register</button>
      </div>
      <button id="reset_open" class="subtext">Forgot Password?</button>
    </div>
  `;
  document.body.appendChild(modal);

  const doLogin = async () => {
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;
    if (!username || !password) {
      alertDialog('Error', 'Please enter username and password.');
      return;
    }

    try {
      const data = await api.post('auth/login.php', { username, password });
      localStorage.setItem('username', data.username);
      toast('Welcome', `Logged in as ${data.username}.`);
      closeModal('login-modal');
      onSuccess?.(data.username);
    } catch (err) {
      alertDialog('Login error', err.message);
    }
  };

  modal.querySelector('#login_btn').addEventListener('click', doLogin);
  modal.querySelector('#register_open').addEventListener('click', () => showRegisterModal({ api, onBack: () => showLoginModal({ api, onSuccess }) }));
  modal.querySelector('#reset_open').addEventListener('click', () => showResetModal({ api, onBack: () => showLoginModal({ api, onSuccess }) }));
  modal.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}

function showRegisterModal({ api, onBack }) {
  closeModal('register-modal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'register-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Register for Nota</h3>
      <input type="text" id="reg_username" placeholder="Username" autocomplete="username">
      <input type="password" id="reg_password" placeholder="Password (min 8 chars)" autocomplete="new-password">
      <input type="text" id="reg_security_question" placeholder="Security Question">
      <input type="text" id="reg_security_answer" placeholder="Security Answer">
      <div class="button-row">
        <button id="reg_btn">Register</button>
        <button id="back_btn">Back</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#back_btn').addEventListener('click', () => { closeModal('register-modal'); onBack?.(); });
  modal.querySelector('#reg_btn').addEventListener('click', async () => {
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const security_question = document.getElementById('reg_security_question').value.trim();
    const security_answer = document.getElementById('reg_security_answer').value.trim();

    if (!username || !password || !security_question || !security_answer) {
      alertDialog('Error', 'All fields are required.');
      return;
    }

    try {
      const data = await api.post('auth/register.php', { username, password, security_question, security_answer });
      alertDialog('Registration', data.message || 'Registration successful.', () => {
        closeModal('register-modal');
        onBack?.();
      });
    } catch (err) {
      alertDialog('Registration error', err.message);
    }
  });
}

function showResetModal({ api, onBack }) {
  closeModal('reset-modal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'reset-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Reset Password</h3>
      <input type="text" id="reset_username" placeholder="Username" autocomplete="username">
      <input type="text" id="reset_security_answer" placeholder="Security Answer">
      <input type="password" id="reset_new_password" placeholder="New Password (min 8 chars)" autocomplete="new-password">
      <div class="button-row">
        <button id="reset_btn">Reset</button>
        <button id="back_btn">Back</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#back_btn').addEventListener('click', () => { closeModal('reset-modal'); onBack?.(); });
  modal.querySelector('#reset_btn').addEventListener('click', async () => {
    const username = document.getElementById('reset_username').value.trim();
    const security_answer = document.getElementById('reset_security_answer').value.trim();
    const new_password = document.getElementById('reset_new_password').value;

    if (!username || !security_answer || !new_password) {
      alertDialog('Error', 'All fields are required.');
      return;
    }

    try {
      const data = await api.post('auth/reset_password.php', { username, security_answer, new_password });
      alertDialog('Password reset', data.message || 'Password updated.', () => {
        closeModal('reset-modal');
        onBack?.();
      });
    } catch (err) {
      alertDialog('Reset error', err.message);
    }
  });
}

async function main() {
  applyThemeFromPrefs();

  const api = new ApiClient({ baseUrl: 'api' });
  await api.initSession();

  const manager = new NoteManager(api);
  window.NoteManager = manager; // for add button onclick compatibility

  // Header wiring
  const logoutBtn = document.getElementById('logout');
  const searchEl = document.getElementById('search');
  const sortEl = document.getElementById('sort');
  const themeBtn = document.getElementById('theme');
  const exportBtn = document.getElementById('export');
  const importBtn = document.getElementById('import');

  themeBtn?.addEventListener('click', toggleTheme);
  exportBtn?.addEventListener('click', () => manager.exportNotes());
  importBtn?.addEventListener('click', () => manager.importNotes());

  searchEl?.addEventListener('input', (e) => manager.setSearch(e.target.value));
  sortEl?.addEventListener('change', (e) => manager.setSort(e.target.value));

  logoutBtn?.addEventListener('click', async () => {
    try {
      await api.post('auth/logout.php', {});
      localStorage.removeItem('username');
      toast('Logged out', 'Session ended.');
      location.reload();
    } catch (err) {
      alertDialog('Error', err.message);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      manager.createNote();
    }
    if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchEl?.focus();
    }
    if (mod && e.key.toLowerCase() === 's') {
      // Flush any pending saves for the currently focused note
      e.preventDefault();
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains('note-content')) {
        const noteEl = active.closest('.note');
        const idx = Array.from(document.querySelectorAll('#notes-container .note')).indexOf(noteEl);
        const note = manager.filteredNotes[idx];
        if (note) {
          manager.flushContentSave(note.id);
          manager.flushMetaSave(note.id);
          toast('Saved', 'Save requested.');
        }
      }
    }
    if (mod && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      manager.exportNotes();
    }
  });

  const boot = async () => {
    manager.setHeaderUsername(api.authenticated ? api.username : null);
    if (api.authenticated) {
      await manager.loadNotes();
      // Remove intro if any
      document.getElementById('intro-overlay')?.remove();
    } else {
      showLoginModal({
        api,
        onSuccess: async (username) => {
          manager.setHeaderUsername(username);
          await api.initSession(); // refresh session state + csrf
          await manager.loadNotes();
        }
      });
    }
  };

  // Preserve original intro when not logged in.
  if (!api.authenticated && !localStorage.getItem('nota_intro_seen')) {
    introSequence(() => {
      localStorage.setItem('nota_intro_seen', '1');
      boot();
    });
  } else {
    // If already logged in, we remove overlay immediately.
    document.getElementById('intro-overlay')?.remove();
    boot();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main().catch((err) => {
    console.error(err);
    alertDialog('Startup error', err.message || 'Failed to start Nota.');
  });
});
