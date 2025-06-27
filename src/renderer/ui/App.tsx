import React, { useEffect, useState, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { SidePanel } from './components/SidePanel';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useWindowState } from '../hooks/useWindowState';

interface AppState {
  showSidePanel: boolean;
  showSettings: boolean;
  isLoading: boolean;
  error: string | null;
}

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    showSidePanel: false,
    showSettings: false,
    isLoading: true,
    error: null
  });

  const { theme, toggleTheme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { windowState, updateWindowState } = useWindowState();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Ctrl+,': () => setState(prev => ({ ...prev, showSettings: !prev.showSettings })),
    'Ctrl+Shift+S': () => setState(prev => ({ ...prev, showSidePanel: !prev.showSidePanel })),
    'Ctrl+Shift+D': toggleTheme,
    'F5': () => window.electronAPI?.invoke('window:reload'),
    'F11': () => window.electronAPI?.invoke('app:toggle-fullscreen'),
    'F12': () => window.electronAPI?.invoke('window:dev-tools'),
  });

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Check if electron API is available
        if (!window.electronAPI) {
          throw new Error('ElectronAPI not available');
        }

        // Load initial settings
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for initialization

        // Apply theme
        if (settings.theme === 'system') {
          const systemTheme = window.themeUtils?.getSystemTheme() || 'light';
          setTheme(systemTheme);
        } else {
          setTheme(settings.theme);
        }

        // Set up system theme watcher
        if (window.themeUtils?.watchSystemTheme) {
          const unwatch = window.themeUtils.watchSystemTheme((systemTheme) => {
            if (settings.theme === 'system') {
              setTheme(systemTheme);
            }
          });

          // Cleanup on unmount
          return unwatch;
        }

        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    };

    initializeApp();
  }, [settings.theme, setTheme]);

  // Handle window controls
  const handleMinimize = useCallback(() => {
    window.electronAPI?.send('app:minimize');
  }, []);

  const handleMaximize = useCallback(() => {
    window.electronAPI?.send('app:maximize');
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.send('app:close');
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    window.electronAPI?.send('app:toggle-fullscreen');
  }, []);

  // Handle menu actions
  const handleOpenSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: true }));
  }, []);

  const handleCloseSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: false }));
  }, []);

  const handleToggleSidePanel = useCallback(() => {
    setState(prev => ({ ...prev, showSidePanel: !prev.showSidePanel }));
  }, []);

  const handleReload = useCallback(() => {
    window.electronAPI?.send('window:reload');
  }, []);

  const handleGoBack = useCallback(() => {
    window.electronAPI?.invoke('window:go-back');
  }, []);

  const handleGoForward = useCallback(() => {
    window.electronAPI?.invoke('window:go-forward');
  }, []);

  const handleZoomIn = useCallback(() => {
    window.electronAPI?.invoke('window:zoom-in');
  }, []);

  const handleZoomOut = useCallback(() => {
    window.electronAPI?.invoke('window:zoom-out');
  }, []);

  const handleResetZoom = useCallback(() => {
    window.electronAPI?.invoke('window:reset-zoom');
  }, []);

  // Error state
  if (state.error) {
    return (
      <div className="app-error">
        <div className="error-content">
          <h2>Application Error</h2>
          <p>{state.error}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing ElectronX...</p>
      </div>
    );
  }

  return (
    <div className={`app ${theme}`} data-theme={theme}>
      {/* Custom Title Bar */}
      <TitleBar
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSidePanel={handleToggleSidePanel}
        onOpenSettings={handleOpenSettings}
        onReload={handleReload}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        showSidePanel={state.showSidePanel}
        title="ElectronX"
      />

      <div className="app-content">
        {/* Side Panel */}
        {state.showSidePanel && (
          <SidePanel
            onClose={() => setState(prev => ({ ...prev, showSidePanel: false }))}
            onNavigate={(url) => {
              window.electronAPI?.invoke('window:load-url', { url });
            }}
          />
        )}

        {/* Main Content Area (X.com will be loaded here via BrowserView) */}
        <div className="main-content">
          <div className="browser-view-placeholder">
            {/* This is where the BrowserView content will be displayed */}
            <div className="browser-view-overlay">
              {/* Overlay for custom UI elements if needed */}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        connectionStatus="connected"
        theme={theme}
        onToggleTheme={toggleTheme}
        zoomLevel={settings.zoomLevel}
        onZoomChange={(level) => updateSettings({ zoomLevel: level })}
      />

      {/* Settings Modal */}
      {state.showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onReset={resetSettings}
          onClose={handleCloseSettings}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
    </div>
  );
};