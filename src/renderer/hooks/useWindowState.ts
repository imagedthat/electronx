import { useState, useEffect, useCallback } from 'react';
import { WindowState } from '../../shared/types/ipc';

interface WindowStateHook {
  windowState: WindowState | null;
  updateWindowState: (updates: Partial<WindowState>) => Promise<void>;
  isMaximized: boolean;
  isFullScreen: boolean;
  isMinimized: boolean;
  toggleMaximize: () => void;
  toggleFullscreen: () => void;
  minimize: () => void;
  restore: () => void;
  center: () => void;
  focus: () => void;
}

export const useWindowState = (): WindowStateHook => {
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Load initial window state
  useEffect(() => {
    const loadWindowState = async () => {
      try {
        if (window.electronAPI) {
          const response = await window.electronAPI.invoke('window:get-state');
          if (response.success && response.data) {
            setWindowState(response.data);
            setIsMaximized(response.data.isMaximized || false);
            setIsFullScreen(response.data.isFullScreen || false);
          }
        }
      } catch (error) {
        console.error('Failed to load window state:', error);
      }
    };

    loadWindowState();
  }, []);

  // Listen for window state changes from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleWindowStateChange = (newState: WindowState) => {
      setWindowState(newState);
      setIsMaximized(newState.isMaximized || false);
      setIsFullScreen(newState.isFullScreen || false);
    };

    const handleMaximized = () => setIsMaximized(true);
    const handleUnmaximized = () => setIsMaximized(false);
    const handleMinimized = () => setIsMinimized(true);
    const handleRestored = () => setIsMinimized(false);
    const handleEnterFullScreen = () => setIsFullScreen(true);
    const handleLeaveFullScreen = () => setIsFullScreen(false);

    // Subscribe to window events
    const unsubscribers = [
      window.electronAPI.on('window:state-changed', handleWindowStateChange),
      window.electronAPI.on('window:maximized', handleMaximized),
      window.electronAPI.on('window:unmaximized', handleUnmaximized),
      window.electronAPI.on('window:minimized', handleMinimized),
      window.electronAPI.on('window:restored', handleRestored),
      window.electronAPI.on('window:enter-fullscreen', handleEnterFullScreen),
      window.electronAPI.on('window:leave-fullscreen', handleLeaveFullScreen)
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Update window state
  const updateWindowState = useCallback(async (updates: Partial<WindowState>) => {
    try {
      if (!window.electronAPI) return;

      const newState = windowState ? { ...windowState, ...updates } : updates as WindowState;
      
      const response = await window.electronAPI.invoke('window:set-state', newState);
      if (response.success) {
        setWindowState(newState);
      }
    } catch (error) {
      console.error('Failed to update window state:', error);
    }
  }, [windowState]);

  // Window control functions
  const toggleMaximize = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.send(isMaximized ? 'app:unmaximize' : 'app:maximize');
    }
  }, [isMaximized]);

  const toggleFullscreen = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.send('app:toggle-fullscreen');
    }
  }, []);

  const minimize = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.send('app:minimize');
    }
  }, []);

  const restore = useCallback(() => {
    if (window.electronAPI) {
      if (isMaximized) {
        window.electronAPI.send('app:unmaximize');
      } else if (isMinimized) {
        window.electronAPI.send('app:restore');
      }
    }
  }, [isMaximized, isMinimized]);

  const center = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.invoke('window:center').catch(console.error);
    }
  }, []);

  const focus = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.invoke('window:focus').catch(console.error);
    }
  }, []);

  // Auto-save window state periodically
  useEffect(() => {
    if (!windowState) return;

    const saveInterval = setInterval(async () => {
      try {
        if (window.electronAPI && !isMinimized && !isFullScreen) {
          await window.electronAPI.invoke('window:save-state');
        }
      } catch (error) {
        console.error('Failed to auto-save window state:', error);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [windowState, isMinimized, isFullScreen]);

  // Handle window resize events
  useEffect(() => {
    const handleResize = window.performanceUtils?.throttle(() => {
      if (!isMaximized && !isFullScreen && windowState) {
        updateWindowState({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    }, 200);

    if (handleResize) {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [updateWindowState, isMaximized, isFullScreen, windowState]);

  // Handle window move events
  useEffect(() => {
    const handleMove = window.performanceUtils?.debounce(() => {
      if (!isMaximized && !isFullScreen && window.electronAPI) {
        window.electronAPI.invoke('window:get-position')
          .then(response => {
            if (response.success && response.data) {
              updateWindowState({
                x: response.data.x,
                y: response.data.y
              });
            }
          })
          .catch(console.error);
      }
    }, 300);

    if (handleMove) {
      // Note: 'move' event needs to be handled differently in Electron
      // This would typically be handled by the main process
      const interval = setInterval(handleMove, 1000);
      return () => clearInterval(interval);
    }
  }, [updateWindowState, isMaximized, isFullScreen]);

  return {
    windowState,
    updateWindowState,
    isMaximized,
    isFullScreen,
    isMinimized,
    toggleMaximize,
    toggleFullscreen,
    minimize,
    restore,
    center,
    focus
  };
};