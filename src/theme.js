const STORAGE_KEY = 'theme';

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return (v === 'light' || v === 'dark') ? v : null;
  } catch (err) {
    return null;
  }
}

function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
}

export function initTheme() {
  const theme = readStoredTheme() || (systemPrefersDark() ? 'dark' : 'light');
  applyTheme(theme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch (err) {}
      applyTheme(next);
    });
  }
}
