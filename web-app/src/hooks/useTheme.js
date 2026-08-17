import { useEffect } from 'react';

/**
 * Single light theme hook.
 * Removes any legacy data-theme attributes from document root.
 */
export function useTheme() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  return {
    theme: 'light',
    isDark: false,
    toggleTheme: () => {},
    setTheme: () => {},
  };
}
