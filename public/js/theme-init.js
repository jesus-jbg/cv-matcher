// Se ejecuta antes de pintar la página para evitar el parpadeo claro/oscuro.
(function () {
  var theme = null;
  try { theme = localStorage.getItem('theme'); } catch (e) { /* almacenamiento bloqueado */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
