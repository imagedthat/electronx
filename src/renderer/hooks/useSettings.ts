import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../../shared/types/ipc';

const defaultSettings: AppSettings = {
  theme: 'system',
  autoHideMenuBar: true,
  alwaysOnTop: false,
  startMinimized: false,
  enableNotifications: true,
  zoomLevel: 1.0,
  customCSS: '',
  blockedKeywords: [],
  autoUpdate: true
};

export const useSettings = () => {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from main process
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (window.electronAPI) {
          const response = await window.electronAPI.invoke('settings:get');
          if (response.success && response.data) {
            setSettingsState({ ...defaultSettings, ...response.data });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
        setError(errorMessage);
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen for settings changes from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleSettingsUpdate = (newSettings: AppSettings) => {
      setSettingsState(prevSettings => ({ ...prevSettings, ...newSettings }));
    };

    const unsubscribe = window.electronAPI.on('settings:updated', handleSettingsUpdate);
    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      
      // Optimistic update
      setSettingsState(newSettings);

      // Save to main process
      if (window.electronAPI) {
        const response = await window.electronAPI.invoke('settings:set', newSettings);
        if (!response.success) {
          throw new Error(response.error || 'Failed to save settings');
        }
      }

      // Apply immediate effects
      await applySettingsEffects(updates);
    } catch (err) {
      // Revert optimistic update on error
      setSettingsState(settings);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      console.error('Failed to update settings:', err);
      
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  }, [settings]);

  const resetSettings = useCallback(async () => {
    try {
      setSettingsState(defaultSettings);

      if (window.electronAPI) {
        const response = await window.electronAPI.invoke('settings:reset');
        if (!response.success) {
          throw new Error(response.error || 'Failed to reset settings');
        }
      }

      await applySettingsEffects(defaultSettings);
    } catch (err) {
      // Revert on error
      setSettingsState(settings);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      console.error('Failed to reset settings:', err);
      
      setTimeout(() => setError(null), 3000);
    }
  }, [settings]);

  // Apply settings effects to the UI
  const applySettingsEffects = useCallback(async (settingsUpdates: Partial<AppSettings>) => {
    try {
      // Apply zoom level
      if (settingsUpdates.zoomLevel !== undefined && window.electronAPI) {
        await window.electronAPI.invoke('window:set-zoom', { level: settingsUpdates.zoomLevel });
      }

      // Apply always on top
      if (settingsUpdates.alwaysOnTop !== undefined && window.electronAPI) {
        await window.electronAPI.send('app:set-always-on-top', { alwaysOnTop: settingsUpdates.alwaysOnTop });
      }

      // Apply custom CSS
      if (settingsUpdates.customCSS !== undefined) {
        applyCustomCSS(settingsUpdates.customCSS);
      }

      // Update notifications permission
      if (settingsUpdates.enableNotifications !== undefined && window.electronAPI) {
        if (settingsUpdates.enableNotifications) {
          await window.electronAPI.invoke('notifications:permission');
        }
      }
    } catch (error) {
      console.error('Failed to apply settings effects:', error);
    }
  }, []);

  const applyCustomCSS = useCallback((css: string) => {
    // Remove existing custom styles
    const existingStyle = document.getElementById('electronx-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Apply new custom styles if provided
    if (css.trim()) {
      const style = document.createElement('style');
      style.id = 'electronx-custom-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }, []);

  // Validate settings
  const validateSettings = useCallback((settingsToValidate: Partial<AppSettings>): string[] => {
    const errors: string[] = [];

    if (settingsToValidate.theme && !['light', 'dark', 'system'].includes(settingsToValidate.theme)) {
      errors.push('Invalid theme value');
    }

    if (settingsToValidate.zoomLevel !== undefined) {
      if (typeof settingsToValidate.zoomLevel !== 'number' || 
          settingsToValidate.zoomLevel < 0.25 || 
          settingsToValidate.zoomLevel > 5.0) {
        errors.push('Zoom level must be between 0.25 and 5.0');
      }
    }

    if (settingsToValidate.blockedKeywords && !Array.isArray(settingsToValidate.blockedKeywords)) {
      errors.push('Blocked keywords must be an array');
    }

    if (settingsToValidate.customCSS !== undefined && typeof settingsToValidate.customCSS !== 'string') {
      errors.push('Custom CSS must be a string');
    }

    return errors;
  }, []);

  // Get specific setting value
  const getSetting = useCallback(<K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return settings[key];
  }, [settings]);

  // Check if a setting has been modified from default
  const isSettingModified = useCallback(<K extends keyof AppSettings>(key: K): boolean => {
    return settings[key] !== defaultSettings[key];
  }, [settings]);

  // Export settings for backup
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // Import settings from backup
  const importSettings = useCallback(async (settingsJson: string): Promise<void> => {
    try {
      const importedSettings = JSON.parse(settingsJson) as AppSettings;
      const validationErrors = validateSettings(importedSettings);
      
      if (validationErrors.length > 0) {
        throw new Error(`Invalid settings: ${validationErrors.join(', ')}`);
      }

      await updateSettings(importedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import settings';
      throw new Error(errorMessage);
    }
  }, [updateSettings, validateSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    validateSettings,
    getSetting,
    isSettingModified,
    exportSettings,
    importSettings,
    applyCustomCSS
  };
};