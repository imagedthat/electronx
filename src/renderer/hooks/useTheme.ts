import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from settings
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        if (window.electronAPI) {
          const response = await window.electronAPI.invoke('settings:get');
          if (response.success && response.data?.theme) {
            setThemeState(response.data.theme);
          }
        }
      } catch (error) {
        console.error('Failed to load theme setting:', error);
      }
    };

    initializeTheme();
  }, []);

  // Resolve system theme
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.themeUtils?.getSystemTheme() || 'light';
        setResolvedTheme(systemTheme);
      } else {
        setResolvedTheme(theme);
      }
    };

    resolveTheme();

    // Watch for system theme changes
    if (theme === 'system' && window.themeUtils?.watchSystemTheme) {
      const unwatch = window.themeUtils.watchSystemTheme((systemTheme) => {
        setResolvedTheme(systemTheme);
      });

      return unwatch;
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;

    // Notify main process about theme change
    if (window.electronAPI) {
      window.electronAPI.invoke('theme:set', { theme: resolvedTheme }).catch(console.error);
    }
  }, [resolvedTheme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      // Save theme setting
      if (window.electronAPI) {
        await window.electronAPI.invoke('settings:set', { theme: newTheme });
      }
    } catch (error) {
      console.error('Failed to save theme setting:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = resolvedTheme;
    const newTheme = currentResolved === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme: resolvedTheme,
    rawTheme: theme,
    setTheme,
    toggleTheme
  };
};