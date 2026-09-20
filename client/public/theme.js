// Runs before styles and React, without inline-script CSP exceptions.
(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => (['light', 'dark', 'system'].includes(value) ? value : 'system');
  let preference = 'system';
  try {
    preference = valid(localStorage.getItem('forma:theme'));
  } catch {
    /* Storage may be disabled. */
  }
  function apply() {
    const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.dispatchEvent(new Event('forma:theme-change'));
  }
  window.formaTheme = {
    get: () => preference,
    set(value) {
      preference = valid(value);
      try {
        localStorage.setItem('forma:theme', preference);
      } catch {
        /* Keep this session usable. */
      }
      apply();
    },
  };
  media.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    if (event.key === 'forma:theme' || event.key === null) {
      preference = valid(event.newValue);
      apply();
    }
  });
  apply();
})();
