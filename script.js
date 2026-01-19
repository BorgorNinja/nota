// Backwards-compatible shim.
// If an older deployment still references /script.js, this will load the new module entrypoint.
(function () {
  const already = Array.from(document.scripts).some(s => (s.type === 'module') && (s.src || '').includes('public/assets/js/app.js'));
  if (already) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'public/assets/js/app.js';
  document.body.appendChild(s);
})();
