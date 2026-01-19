import { renderMarkdown } from './markdown.js';
import { alertDialog, confirmDialog, closeModal, toast, pickFile, downloadText } from './ui.js';

function debounce(fn, delay = 700) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export class NoteManager {
  constructor(api) {
    this.api = api;
    this.notes = [];
    this.filteredNotes = [];
    this.searchTerm = '';
    this.sortMode = 'updated_desc';
    this.saveState = new Map(); // noteId -> { status, lastError }
    this.pendingSaves = new Map(); // noteId -> { content, title }
    this.pendingMeta = new Map(); // noteId -> { title, tags, is_pinned }

    this.debouncedSaveContent = debounce((noteId) => this.flushContentSave(noteId), 700);
    this.debouncedSaveMeta = debounce((noteId) => this.flushMetaSave(noteId), 550);
  }

  setHeaderUsername(username) {
    const titleEl = document.getElementById('header-title');
    const logoutBtn = document.getElementById('logout');
    const subtitle = document.getElementById('header-subtitle');

    if (username) {
      titleEl.textContent = `Nota - ${username}`;
      if (subtitle) subtitle.textContent = 'Ctrl+N new note · Ctrl+F search · Ctrl+S save';
      logoutBtn.style.display = 'inline-flex';
    } else {
      titleEl.textContent = 'Nota';
      if (subtitle) subtitle.textContent = 'Please log in';
      logoutBtn.style.display = 'none';
    }
  }

  async loadNotes() {
    const data = await this.api.post('notes.php', { action: 'fetch' }, { requireCsrf: false });
    this.notes = Array.isArray(data.notes) ? data.notes : [];

    // Seed save states
    this.notes.forEach((n) => {
      if (!this.saveState.has(n.id)) this.saveState.set(n.id, { status: 'saved', lastError: null });
    });

    this.applyFilters();
    this.render();
  }

  applyFilters() {
    const q = (this.searchTerm || '').trim().toLowerCase();
    let arr = [...this.notes];

    if (q) {
      arr = arr.filter((n) => {
        const hay = `${n.title || ''}\n${n.tags || ''}\n${n.content || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    switch (this.sortMode) {
      case 'created_desc':
        arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'title_asc':
        arr.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      case 'updated_desc':
      default:
        arr.sort((a, b) => {
          const pin = (Number(b.is_pinned) || 0) - (Number(a.is_pinned) || 0);
          if (pin !== 0) return pin;
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        break;
    }

    this.filteredNotes = arr;
  }

  setSearch(term) {
    this.searchTerm = term;
    this.applyFilters();
    this.render();
  }

  setSort(mode) {
    this.sortMode = mode;
    this.applyFilters();
    this.render();
  }

  render() {
    const container = document.getElementById('notes-container');
    if (!container) return;
    container.innerHTML = '';

    this.filteredNotes.forEach((note) => {
      const el = document.createElement('div');
      el.className = `note ${Number(note.is_pinned) ? 'pinned' : ''}`;
      const status = this.saveState.get(note.id)?.status || 'saved';
      const saveLabel = status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : 'Saved';

      el.innerHTML = `
        <div class="note-top">
          <input class="note-title" placeholder="Title" value="${escapeHtml(note.title || '')}">
          <div class="note-actions">
            <button class="icon-btn secondary pin-btn" title="Pin">${Number(note.is_pinned) ? '📌' : '📍'}</button>
            <button class="icon-btn secondary preview-btn" title="Preview">👁</button>
            <button class="icon-btn secondary history-btn" title="History">⟳</button>
            <button class="icon-btn delete-btn" title="Delete">×</button>
          </div>
        </div>
        <div class="note-meta">
          <span>${formatDate(note.updated_at)}</span>
          <span class="save-status">${saveLabel}</span>
        </div>
        <textarea class="note-content" spellcheck="true">${escapeTextarea(note.content || '')}</textarea>
        <div class="note-preview"></div>
        <div class="note-footer">
          <div class="left">
            <label title="Share note publicly">
              <input type="checkbox" class="public-toggle" ${Number(note.is_public) ? 'checked' : ''}>
              Public
            </label>
            <input class="note-tags" placeholder="Tags (comma separated)" value="${escapeHtml(note.tags || '')}">
            <span class="pill stats-pill" title="Words / characters">${statsLabel(note.content || '')}</span>
          </div>
          <div class="right">
            ${Number(note.is_public) ? `<button class="pill copy-link-btn" title="Copy share link">Copy Link</button>` : ''}
          </div>
        </div>
      `;

      // Wire events
      const titleInput = el.querySelector('.note-title');
      const textarea = el.querySelector('.note-content');
      const tagsInput = el.querySelector('.note-tags');
      const pinBtn = el.querySelector('.pin-btn');
      const previewBtn = el.querySelector('.preview-btn');
      const historyBtn = el.querySelector('.history-btn');
      const delBtn = el.querySelector('.delete-btn');
      const publicToggle = el.querySelector('.public-toggle');
      const copyBtn = el.querySelector('.copy-link-btn');
      const previewEl = el.querySelector('.note-preview');
      const statsPill = el.querySelector('.stats-pill');

      titleInput.addEventListener('input', () => {
        note.title = titleInput.value;
        this.queueMetaSave(note.id, { title: note.title });
      });

      textarea.addEventListener('input', () => {
        note.content = textarea.value;
        statsPill.textContent = statsLabel(note.content);
        this.queueContentSave(note.id, { content: note.content, title: note.title || '' });
      });

      tagsInput.addEventListener('input', () => {
        note.tags = tagsInput.value;
        this.queueMetaSave(note.id, { tags: note.tags });
      });

      pinBtn.addEventListener('click', () => {
        note.is_pinned = Number(note.is_pinned) ? 0 : 1;
        this.queueMetaSave(note.id, { is_pinned: note.is_pinned });
        toast('Pinned', note.is_pinned ? 'Note pinned to top.' : 'Note unpinned.');
        this.applyFilters();
        this.render();
      });

      previewBtn.addEventListener('click', () => {
        const isVisible = previewEl.style.display === 'block';
        if (isVisible) {
          previewEl.style.display = 'none';
          textarea.style.display = 'block';
        } else {
          previewEl.innerHTML = renderMarkdown(textarea.value);
          previewEl.style.display = 'block';
          textarea.style.display = 'none';
        }
      });

      historyBtn.addEventListener('click', () => this.showHistory(note.id));

      delBtn.addEventListener('click', () => {
        confirmDialog('Delete note', 'This will permanently delete the note (and its history).', () => {
          this.animateDelete(el, note.id);
        });
      });

      publicToggle.addEventListener('change', async (e) => {
        try {
          const data = await this.api.post('notes.php', {
            action: 'toggle_public',
            note_id: note.id,
            public: e.target.checked ? 1 : 0,
          });
          const updated = data.note;
          this.notes = this.notes.map((n) => (n.id === updated.id ? updated : n));
          this.applyFilters();
          this.render();
          toast('Sharing', updated.is_public ? 'Public link enabled.' : 'Public link disabled.');
        } catch (err) {
          e.target.checked = !e.target.checked;
          alertDialog('Error', err.message);
        }
      });

      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const publicURL = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/public_note.php?token=${note.public_token}`;
          try {
            await navigator.clipboard.writeText(publicURL);
            toast('Copied', 'Public link copied to clipboard.');
          } catch {
            alertDialog('Share Note', `Public Link:<br><br><a href="${publicURL}" target="_blank" style="color:#fff;text-decoration:underline;">${publicURL}</a>`);
          }
        });
      }

      container.appendChild(el);
    });
  }

  async createNote() {
    try {
      const data = await this.api.post('notes.php', {
        action: 'create',
        title: 'Untitled',
        content: '',
        tags: '',
      });
      await this.loadNotes();
      toast('Created', 'New note added.');

      // Focus first note textarea (newly created is pinned? no). It's first by updated.
      setTimeout(() => {
        const first = document.querySelector('.note textarea.note-content');
        if (first) first.focus();
      }, 50);

      return data.note_id;
    } catch (err) {
      alertDialog('Error', err.message);
      return null;
    }
  }

  queueContentSave(noteId, { content, title }) {
    this.pendingSaves.set(noteId, { content, title });
    this.setSaveStatus(noteId, 'saving');
    this.debouncedSaveContent(noteId);
  }

  queueMetaSave(noteId, patch) {
    const prev = this.pendingMeta.get(noteId) || {};
    this.pendingMeta.set(noteId, { ...prev, ...patch });
    this.setSaveStatus(noteId, 'saving');
    this.debouncedSaveMeta(noteId);
  }

  setSaveStatus(noteId, status, lastError = null) {
    this.saveState.set(noteId, { status, lastError });
    const noteEl = document.querySelector(`.note [data-note-id="${noteId}"]`);
    // We re-render most of the time; keep simple.
  }

  async flushContentSave(noteId) {
    const payload = this.pendingSaves.get(noteId);
    if (!payload) return;

    try {
      await this.api.post('notes.php', {
        action: 'update',
        note_id: noteId,
        content: payload.content,
        title: payload.title,
      });
      this.pendingSaves.delete(noteId);
      this.saveState.set(noteId, { status: 'saved', lastError: null });

      // Update client-side timestamp for snappier UI (server time will be corrected on reload)
      const n = this.notes.find((x) => x.id === noteId);
      if (n) n.updated_at = new Date().toISOString();
      this.applyFilters();
      this.render();
    } catch (err) {
      this.saveState.set(noteId, { status: 'error', lastError: err.message });
      this.render();
    }
  }

  async flushMetaSave(noteId) {
    const patch = this.pendingMeta.get(noteId);
    if (!patch) return;

    try {
      await this.api.post('notes.php', {
        action: 'update_meta',
        note_id: noteId,
        title: patch.title ?? undefined,
        tags: patch.tags ?? undefined,
        is_pinned: patch.is_pinned ?? undefined,
      });
      this.pendingMeta.delete(noteId);
      this.saveState.set(noteId, { status: 'saved', lastError: null });

      const n = this.notes.find((x) => x.id === noteId);
      if (n) {
        if (patch.title !== undefined) n.title = patch.title;
        if (patch.tags !== undefined) n.tags = patch.tags;
        if (patch.is_pinned !== undefined) n.is_pinned = patch.is_pinned;
        n.updated_at = new Date().toISOString();
      }

      this.applyFilters();
      this.render();
    } catch (err) {
      this.saveState.set(noteId, { status: 'error', lastError: err.message });
      this.render();
    }
  }

  async animateDelete(noteEl, noteId) {
    noteEl.classList.add('note-delete-animation');
    noteEl.addEventListener('animationend', async () => {
      try {
        await this.api.post('notes.php', { action: 'delete', note_id: noteId });
        this.notes = this.notes.filter((n) => n.id !== noteId);
        this.applyFilters();
        this.render();
        toast('Deleted', 'Note removed.');
      } catch (err) {
        alertDialog('Error', err.message);
        noteEl.classList.remove('note-delete-animation');
      }
    }, { once: true });
  }

  async showHistory(noteId) {
    try {
      const data = await this.api.post('notes.php', { action: 'history', note_id: noteId }, { requireCsrf: false });
      const versions = data.versions || [];

      const rows = versions.map((v) => {
        const when = formatDate(v.created_at);
        const preview = escapeHtml((v.preview || '').replace(/\n/g, ' '));
        return `<div style="text-align:left;margin:10px 0;padding:10px;border-radius:12px;background:rgba(255,255,255,0.12)">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div style="font-weight:bold">${when}</div>
            <button class="pill" data-restore="${v.id}">Restore</button>
          </div>
          <div style="opacity:0.95;margin-top:6px;white-space:pre-wrap">${preview}</div>
        </div>`;
      }).join('');

      const bodyHtml = versions.length
        ? `<div style="max-height:52vh;overflow:auto">${rows}</div>`
        : '<p>No versions yet. Edits are versioned automatically.</p>';

      const m = document.createElement('div');
      m.className = 'modal';
      m.id = 'history-modal';
      m.innerHTML = `
        <div class="modal-content">
          <h3>Note History</h3>
          <div class="modal-body">${bodyHtml}</div>
          <div class="button-row">
            <button id="history-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(m);

      m.querySelector('#history-close').addEventListener('click', () => closeModal('history-modal'));
      m.querySelectorAll('button[data-restore]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const versionId = btn.getAttribute('data-restore');
          confirmDialog('Restore version', 'Replace current note content with this version?', async () => {
            try {
              await this.api.post('notes.php', { action: 'restore', note_id: noteId, version_id: versionId });
              closeModal('history-modal');
              toast('Restored', 'Version restored.');
              await this.loadNotes();
            } catch (err) {
              alertDialog('Error', err.message);
            }
          });
        });
      });
    } catch (err) {
      alertDialog('Error', err.message);
    }
  }

  async exportNotes() {
    try {
      const data = await this.api.post('notes.php', { action: 'export' }, { requireCsrf: false });
      const filename = `nota-export-${new Date().toISOString().slice(0,10)}.json`;
      downloadText(filename, JSON.stringify(data, null, 2), 'application/json');
      toast('Exported', 'Download started.');
    } catch (err) {
      alertDialog('Error', err.message);
    }
  }

  async importNotes() {
    const file = await pickFile({ accept: '.json,application/json' });
    if (!file) return;

    try {
      const text = await file.text();
      // Basic sanity check
      JSON.parse(text);

      const res = await this.api.post('notes.php', { action: 'import', payload: text });
      toast('Imported', `Imported ${res.imported} note(s).`);
      await this.loadNotes();
    } catch (err) {
      alertDialog('Import failed', err.message || 'Invalid file.');
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeTextarea(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function statsLabel(content) {
  const s = String(content || '').trim();
  if (!s) return '0 words · 0 chars';
  const words = s.split(/\s+/).filter(Boolean).length;
  const chars = s.length;
  return `${words} words · ${chars} chars`;
}
