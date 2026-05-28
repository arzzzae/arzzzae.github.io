import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/**
 * Light/dark theme toggle. Persists the choice in localStorage and defaults to
 * the system preference. The actual color application is driven by the
 * `data-theme` attribute on <html> (see global.css), and an inline script in
 * the layout sets it before paint to avoid a flash.
 */
export default function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = (): void => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
