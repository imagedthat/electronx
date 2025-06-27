import { useEffect, useCallback } from 'react';

type ShortcutMap = Record<string, () => void>;
type ModifierKey = 'Ctrl' | 'Shift' | 'Alt' | 'Meta';

interface KeyboardEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  const parseShortcut = useCallback((shortcut: string) => {
    const parts = shortcut.split('+').map(part => part.trim());
    const modifiers = new Set<string>();
    let key = '';

    for (const part of parts) {
      if (['Ctrl', 'Shift', 'Alt', 'Meta', 'Cmd'].includes(part)) {
        modifiers.add(part === 'Cmd' ? 'Meta' : part);
      } else {
        key = part;
      }
    }

    return { modifiers, key };
  }, []);

  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: string): boolean => {
    const { modifiers, key } = parseShortcut(shortcut);
    
    // Check if the key matches (case insensitive)
    const keyMatch = event.key.toLowerCase() === key.toLowerCase() ||
                     event.key === key ||
                     (key === 'Space' && event.key === ' ');

    if (!keyMatch) return false;

    // Check modifiers
    const requiredCtrl = modifiers.has('Ctrl');
    const requiredShift = modifiers.has('Shift');
    const requiredAlt = modifiers.has('Alt');
    const requiredMeta = modifiers.has('Meta');

    return event.ctrlKey === requiredCtrl &&
           event.shiftKey === requiredShift &&
           event.altKey === requiredAlt &&
           event.metaKey === requiredMeta;
  }, [parseShortcut]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts if we're in an input field
    const target = event.target as HTMLElement | null;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]')
    )) {
      return;
    }

    // Check each shortcut
    for (const [shortcut, handler] of Object.entries(shortcuts)) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          handler();
        } catch (error) {
          console.error(`Error executing shortcut ${shortcut}:`, error);
        }
        
        break; // Only execute the first matching shortcut
      }
    }
  }, [shortcuts, matchesShortcut]);

  useEffect(() => {
    const keyDownHandler = (event: globalThis.KeyboardEvent) => {
      handleKeyDown(event as unknown as KeyboardEvent);
    };

    document.addEventListener('keydown', keyDownHandler);
    
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, [handleKeyDown]);

  // Register global shortcuts with main process
  useEffect(() => {
    const registerGlobalShortcuts = async () => {
      if (!window.electronAPI) return;

      const globalShortcuts = [
        'Ctrl+Shift+D', // Toggle dev tools
        'Ctrl+R',       // Reload
        'F5',           // Reload
        'F11',          // Fullscreen
        'F12'           // Dev tools
      ];

      for (const shortcut of globalShortcuts) {
        if (shortcuts[shortcut]) {
          try {
            await window.electronAPI.invoke('shortcuts:register', {
              accelerator: shortcut,
              callback: shortcuts[shortcut]
            });
          } catch (error) {
            console.warn(`Failed to register global shortcut ${shortcut}:`, error);
          }
        }
      }
    };

    registerGlobalShortcuts();

    return () => {
      // Cleanup global shortcuts
      if (window.electronAPI) {
        const globalShortcuts = ['Ctrl+Shift+D', 'Ctrl+R', 'F5', 'F11', 'F12'];
        globalShortcuts.forEach(shortcut => {
          window.electronAPI.invoke('shortcuts:unregister', { accelerator: shortcut })
            .catch(error => console.warn(`Failed to unregister shortcut ${shortcut}:`, error));
        });
      }
    };
  }, [shortcuts]);

  // Return utility functions for dynamic shortcut management
  return {
    parseShortcut,
    matchesShortcut,
    
    // Add a shortcut dynamically
    addShortcut: useCallback((shortcut: string, handler: () => void) => {
      shortcuts[shortcut] = handler;
    }, [shortcuts]),
    
    // Remove a shortcut
    removeShortcut: useCallback((shortcut: string) => {
      delete shortcuts[shortcut];
    }, [shortcuts]),
    
    // Get all registered shortcuts
    getShortcuts: useCallback(() => {
      return Object.keys(shortcuts);
    }, [shortcuts]),
    
    // Check if a shortcut is registered
    hasShortcut: useCallback((shortcut: string) => {
      return shortcut in shortcuts;
    }, [shortcuts]),
    
    // Get shortcut description for UI
    getShortcutDisplay: useCallback((shortcut: string) => {
      const isMac = window.platform?.isMacOS || navigator.platform.toLowerCase().includes('mac');
      
      return shortcut
        .replace(/Ctrl/g, isMac ? '⌘' : 'Ctrl')
        .replace(/Shift/g, isMac ? '⇧' : 'Shift')
        .replace(/Alt/g, isMac ? '⌥' : 'Alt')
        .replace(/Meta/g, '⌘')
        .replace(/\+/g, isMac ? '' : '+');
    }, [])
  };
};