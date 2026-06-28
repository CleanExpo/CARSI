(function () {
  try {
    var t = localStorage.getItem('carsi-theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
