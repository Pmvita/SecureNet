import { useState, useCallback, useEffect } from 'react';
import type { Theme } from '../types';

interface ThemeState {
  theme: Theme;
  isSystemTheme: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_KEY = 'theme_preference';

export function useTheme(): ThemeState {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get saved theme preference
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    return 'system';
  });

  const [isSystemTheme, setIsSystemTheme] = useState(theme === 'system');

  // Get the actual theme value (resolving 'system' to the system preference)
  const getActualTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme as 'light' | 'dark';
  }, [theme]);

  // Update the document theme
  const updateDocumentTheme = useCallback((newTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${newTheme}-theme`);
  }, []);

  // Set theme and save preference
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setIsSystemTheme(newTheme === 'system');
    localStorage.setItem(THEME_KEY, newTheme);
    updateDocumentTheme(getActualTheme());
  }, [getActualTheme, updateDocumentTheme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    const currentTheme = getActualTheme();
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  }, [getActualTheme, setTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!isSystemTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      updateDocumentTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemTheme, updateDocumentTheme]);

  // Initial theme setup
  useEffect(() => {
    updateDocumentTheme(getActualTheme());
  }, [getActualTheme, updateDocumentTheme]);

  return {
    theme,
    isSystemTheme,
    setTheme,
    toggleTheme,
  };
}

// Example usage:
/*
function ThemeToggle() {
  const { theme, isSystemTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button
        className={`theme-button ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        aria-label="Light theme"
      >
        ☀️
      </button>
      <button
        className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-label="Dark theme"
      >
        🌙
      </button>
      <button
        className={`theme-button ${isSystemTheme ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        aria-label="System theme"
      >
        💻
      </button>

      <style jsx>{`
        .theme-toggle {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: var(--bg-secondary);
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .theme-button {
          padding: 8px;
          border: none;
          border-radius: 4px;
          background: none;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .theme-button:hover {
          background: var(--bg-hover);
        }

        .theme-button.active {
          background: var(--primary-color);
          color: var(--text-on-primary);
        }
      `}</style>
    </div>
  );
}

// CSS variables for theming:
/*
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-hover: #e5e5e5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --primary-color: #007bff;
  --text-on-primary: #ffffff;
  --border-color: #dddddd;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-hover: #3d3d3d;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --primary-color: #0d6efd;
  --text-on-primary: #ffffff;
  --border-color: #404040;
  --shadow-color: rgba(0, 0, 0, 0.3);
}

* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}
*/ 