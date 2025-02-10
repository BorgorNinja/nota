    /* --- INTRO SEQUENCE --- */
    function introSequence() {
      const introOverlay = document.getElementById('intro-overlay');
      const introTitle = document.getElementById('intro-title');
      const titleText = "Nota";
      let index = 0;
      introTitle.textContent = "";
      
      function typeWriter() {
        if (index < titleText.length) {
          introTitle.textContent += titleText.charAt(index);
          index++;
          setTimeout(typeWriter, 300); // Slower typing speed
        } else {
          // Pause then slide the title to header position
          setTimeout(() => {
            introTitle.classList.add('slide-to-corner');
            // Wait for the slide animation to finish (2 seconds)
            setTimeout(() => {
              introOverlay.style.opacity = 0;
              setTimeout(() => {
                introOverlay.remove();
                NoteManager.showLoginModal();
              }, 1000);
            }, 2000);
          }, 1000);
        }
      }
      typeWriter();
    }

    /* --- CUSTOM DIALOG (in-theme modal instead of browser alert) --- */
    function showCustomDialog(title, message, callback) {
      const dialog = document.createElement('div');
      dialog.className = 'modal';
      dialog.innerHTML = `
        <div class="modal-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <button id="dialog-ok-btn">OK</button>
        </div>
      `;
      document.body.appendChild(dialog);
      document.getElementById('dialog-ok-btn').addEventListener('click', () => {
        dialog.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => { dialog.remove(); if (callback) callback(); }, 500);
      });
    }

    /* --- NOTE MANAGER & LOGIN/REGISTRATION/NOTES FUNCTIONS --- */
    const NoteManager = {
      init() {
        this.checkSession();
        this.loadNotes();
      },
      checkSession() {
        const params = new URLSearchParams();
        params.append('action', 'fetch');
        fetch('notes.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            this.showLoginModal();
            this.updateHeader(null);
          } else {
            const username = localStorage.getItem('username') || 'User';
            this.updateHeader(username);
            this.renderNotes(data.notes);
          }
        })
        .catch(err => {
          console.error(err);
          this.showLoginModal();
          this.updateHeader(null);
        });
      },
      updateHeader(username) {
        const headerTitle = document.getElementById('header-title');
        const logoutBtn = document.getElementById('logout');
        if (username) {
          headerTitle.textContent = `Nota - ${username}`;
          logoutBtn.style.display = 'block';
        } else {
          headerTitle.textContent = 'Nota';
          logoutBtn.style.display = 'none';
        }
      },
      showLoginModal() {
        this.closeModal('login-modal');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'login-modal';
        modal.innerHTML = `
          <div class="modal-content">
            <h3>Login to Nota</h3>
            <input type="text" id="login_username" placeholder="Username">
            <input type="password" id="login_password" placeholder="Password">
            <div class="button-container">
              <button onclick="NoteManager.handleLogin()">Login</button>
              <button onclick="NoteManager.showRegisterModal()">Register</button>
            </div>
            <button onclick="NoteManager.showResetModal()" class="subtext">Forgot Password?</button>
          </div>
        `;
        document.body.appendChild(modal);
      },
      closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.animation = 'fadeOut 0.5s ease forwards';
          setTimeout(() => modal.remove(), 500);
        }
      },
      backToLogin(modalId) {
        this.closeModal(modalId);
        setTimeout(() => this.showLoginModal(), 500);
      },
      handleLogin() {
        const username = document.getElementById('login_username').value;
        const password = document.getElementById('login_password').value;
        if (!username || !password) {
          showCustomDialog("Error", "Please enter username and password.");
          return;
        }
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        fetch('login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.setItem('username', data.username);
            this.updateHeader(data.username);
            this.closeModal('login-modal');
            this.loadNotes();
          } else {
            showCustomDialog("Login Error", data.message);
          }
        });
      },
      showRegisterModal() {
        this.closeModal('login-modal');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'register-modal';
        modal.innerHTML = `
          <div class="modal-content">
            <h3>Register for Nota</h3>
            <input type="text" id="reg_username" placeholder="Username">
            <input type="password" id="reg_password" placeholder="Password">
            <input type="text" id="reg_security_question" placeholder="Security Question">
            <input type="text" id="reg_security_answer" placeholder="Security Answer">
            <button onclick="NoteManager.handleRegister()">Register</button>
            <br>
            <button onclick="NoteManager.backToLogin('register-modal')" class="subtext">Back to Login</button>
          </div>
        `;
        document.body.appendChild(modal);
      },
      handleRegister() {
        const username = document.getElementById('reg_username').value;
        const password = document.getElementById('reg_password').value;
        const security_question = document.getElementById('reg_security_question').value;
        const security_answer = document.getElementById('reg_security_answer').value;
        if (!username || !password || !security_question || !security_answer) {
          showCustomDialog("Error", "All fields are required.");
          return;
        }
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        params.append('security_question', security_question);
        params.append('security_answer', security_answer);
        fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          showCustomDialog("Registration", data.message, () => {
            if (data.success) location.reload();
          });
        });
      },
      showResetModal() {
        this.closeModal('login-modal');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'reset-modal';
        modal.innerHTML = `
          <div class="modal-content">
            <h3>Reset Password</h3>
            <input type="text" id="reset_username" placeholder="Username">
            <input type="text" id="reset_security_answer" placeholder="Security Answer">
            <input type="password" id="reset_new_password" placeholder="New Password">
            <button onclick="NoteManager.handleReset()">Reset Password</button>
            <br>
            <button onclick="NoteManager.backToLogin('reset-modal')" class="subtext">Back to Login</button>
          </div>
        `;
        document.body.appendChild(modal);
      },
      handleReset() {
        const username = document.getElementById('reset_username').value;
        const security_answer = document.getElementById('reset_security_answer').value;
        const new_password = document.getElementById('reset_new_password').value;
        if (!username || !security_answer || !new_password) {
          showCustomDialog("Error", "All fields are required.");
          return;
        }
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('security_answer', security_answer);
        params.append('new_password', new_password);
        fetch('reset_password.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          showCustomDialog("Reset Password", data.message, () => {
            if (data.success) {
              this.closeModal('reset-modal');
              this.showLoginModal();
            }
          });
        });
      },
      handleLogout() {
        fetch('logout.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.removeItem('username');
            location.reload();
          }
        })
        .catch(err => console.error(err));
      },
      loadNotes() {
        const params = new URLSearchParams();
        params.append('action', 'fetch');
        fetch('notes.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            this.renderNotes(data.notes);
          }
        });
      },
      renderNotes(notes) {
        const container = document.getElementById('notes-container');
        container.innerHTML = "";
        notes.forEach(note => {
          const noteEl = document.createElement('div');
          noteEl.className = 'note';
          noteEl.innerHTML = `
            <div class="note-header">
              <span>${new Date(note.updated_at).toLocaleString()}</span>
              <button class="delete-btn">×</button>
            </div>
            <textarea class="note-content">${note.content}</textarea>
            <div class="note-footer">
              <label>
                <input type="checkbox" class="public-toggle" ${parseInt(note.is_public) === 1 ? "checked" : ""}>
                Public
              </label>
              ${ parseInt(note.is_public) === 1 ? `<button class="copy-link-btn">Copy Link</button>` : "" }
            </div>
          `;
          // Delete note event
          noteEl.querySelector('.delete-btn').addEventListener('click', () => {
            this.animateDelete(noteEl, note.id);
          });
          // Update note content event
          noteEl.querySelector('.note-content').addEventListener('input', (e) => {
            this.updateNote(note.id, e.target.value);
          });
          // Public toggle change event
          const toggle = noteEl.querySelector('.public-toggle');
          toggle.addEventListener('change', (e) => {
            this.togglePublic(note.id, e.target.checked);
          });
          // If note is public, bind Copy Link button event
          const copyBtn = noteEl.querySelector('.copy-link-btn');
          if (copyBtn) {
            copyBtn.addEventListener('click', () => {
              const publicURL = window.location.origin + "/public_note.php?token=" + note.public_token;
              showCustomDialog("Share Note", `Public Link:<br><a href="${publicURL}" target="_blank" style="color:#fff;text-decoration:underline;">${publicURL}</a>`);
            });
          }
          container.appendChild(noteEl);
        });
      },
      createNote() {
        const params = new URLSearchParams();
        params.append('action', 'create');
        params.append('content', 'New note...');
        fetch('notes.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            this.loadNotes();
          }
        });
      },
      updateNote(noteId, content) {
        const params = new URLSearchParams();
        params.append('action', 'update');
        params.append('note_id', noteId);
        params.append('content', content);
        fetch('notes.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
      },
      togglePublic(noteId, isPublic) {
        const params = new URLSearchParams();
        params.append('action', 'toggle_public');
        params.append('note_id', noteId);
        params.append('public', isPublic ? 1 : 0);
        fetch('notes.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            this.loadNotes();
          } else {
            showCustomDialog("Error", data.message);
          }
        });
      },
      animateDelete(noteEl, noteId) {
        noteEl.classList.add('note-delete-animation');
        noteEl.addEventListener('animationend', () => {
          const params = new URLSearchParams();
          params.append('action', 'delete');
          params.append('note_id', noteId);
          fetch('notes.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              noteEl.remove();
            } else {
              showCustomDialog("Error", "Error deleting note.");
            }
          });
        }, { once: true });
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      // If a username is stored in localStorage, assume the user is logged in,
      // initialize the app, and remove the intro overlay.
      if (localStorage.getItem('username')) {
        NoteManager.init();
        const introOverlay = document.getElementById('intro-overlay');
        if (introOverlay) introOverlay.remove();
      } else {
        introSequence();
      }
    });
    window.NoteManager = NoteManager;