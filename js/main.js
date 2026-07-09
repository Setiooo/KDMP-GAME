/* =========================================================================
 * KDMP — main.js — Bootstrap aplikasi
 * ========================================================================= */
(function () {
  function boot() {
    // Render desa
    window.Renderer.init(document.getElementById('village'));
    // UI
    window.UI.init();

    // Layar judul
    const start = document.getElementById('btnStart');
    const cont = document.getElementById('btnContinue');
    const title = document.getElementById('titleScreen');

    if (window.Game.hasSave()) { cont.style.display = 'inline-flex'; }

    start.onclick = () => {
      title.classList.add('hide');
      window.Game.newGame();
      window.UI.refresh();
    };
    cont.onclick = () => {
      title.classList.add('hide');
      if (!window.Game.load()) window.Game.newGame();
      window.UI.refresh();
    };

    // Modal close on backdrop (kecuali event/RAT wajib pilih)
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') { /* wajib memilih, jangan tutup */ }
    });

    // ---- PWA: install prompt ----
    const installBtn = document.getElementById('btnInstall');
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-flex';
    });
    if (installBtn) installBtn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.style.display = 'none';
    };
    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.style.display = 'none';
    });
  }

  // ---- PWA: daftarkan service worker (aktif hanya di http/https) ----
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
