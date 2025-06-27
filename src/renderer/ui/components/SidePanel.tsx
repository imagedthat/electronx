import React, { useState, useEffect } from 'react';

interface NavigationItem {
  id: string;
  label: string;
  url: string;
  icon: React.ReactNode;
  shortcut?: string;
}

interface SidePanelProps {
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ onClose, onNavigate }) => {
  const [activeItem, setActiveItem] = useState<string>('home');
  const [customUrls, setCustomUrls] = useState<NavigationItem[]>([]);

  const defaultNavigation: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      url: 'https://x.com/home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      ),
      shortcut: 'Ctrl+1'
    },
    {
      id: 'explore',
      label: 'Explore',
      url: 'https://x.com/explore',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
      ),
      shortcut: 'Ctrl+2'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      url: 'https://x.com/notifications',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
        </svg>
      ),
      shortcut: 'Ctrl+3'
    },
    {
      id: 'messages',
      label: 'Messages',
      url: 'https://x.com/messages',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
        </svg>
      ),
      shortcut: 'Ctrl+4'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      url: 'https://x.com/i/bookmarks',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
        </svg>
      ),
      shortcut: 'Ctrl+5'
    },
    {
      id: 'lists',
      label: 'Lists',
      url: 'https://x.com/i/lists',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
        </svg>
      ),
      shortcut: 'Ctrl+6'
    },
    {
      id: 'communities',
      label: 'Communities',
      url: 'https://x.com/i/communities',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
          <path d="M6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
        </svg>
      ),
      shortcut: 'Ctrl+7'
    },
    {
      id: 'premium',
      label: 'Premium',
      url: 'https://x.com/i/premium_sign_up',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0110 0a1 1 0 00-1.3 1.046l.412 1.473a7 7 0 108.176 8.176l1.473.412a1 1 0 001.046-1.3 1 1 0 00-1.046-1.3l-1.473.412a7 7 0 00-8.176-8.176L8.7 1.046z" clipRule="evenodd"/>
        </svg>
      ),
      shortcut: 'Ctrl+8'
    }
  ];

  // Load custom URLs from storage
  useEffect(() => {
    const loadCustomUrls = async () => {
      try {
        if (window.storageUtils) {
          const saved = await window.storageUtils.getItem<NavigationItem[]>('custom-navigation', []);
          setCustomUrls(saved || []);
        }
      } catch (error) {
        console.error('Failed to load custom URLs:', error);
      }
    };

    loadCustomUrls();
  }, []);

  const handleNavigation = (item: NavigationItem) => {
    setActiveItem(item.id);
    onNavigate(item.url);
  };

  const addCustomUrl = async () => {
    const url = prompt('Enter URL:');
    const label = prompt('Enter label:');
    
    if (url && label) {
      try {
        const newItem: NavigationItem = {
          id: `custom-${Date.now()}`,
          label,
          url,
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
            </svg>
          )
        };

        const updatedCustomUrls = [...customUrls, newItem];
        setCustomUrls(updatedCustomUrls);
        
        if (window.storageUtils) {
          await window.storageUtils.setItem('custom-navigation', updatedCustomUrls);
        }
      } catch (error) {
        console.error('Failed to add custom URL:', error);
      }
    }
  };

  const removeCustomUrl = async (id: string) => {
    try {
      const updatedCustomUrls = customUrls.filter(item => item.id !== id);
      setCustomUrls(updatedCustomUrls);
      
      if (window.storageUtils) {
        await window.storageUtils.setItem('custom-navigation', updatedCustomUrls);
      }
    } catch (error) {
      console.error('Failed to remove custom URL:', error);
    }
  };

  const allItems = [...defaultNavigation, ...customUrls];

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h2>Navigation</h2>
        <button
          className="close-button"
          onClick={onClose}
          title="Close Panel"
          aria-label="Close side panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.146 2.854a.5.5 0 11.708-.708L8 7.293l5.146-5.147a.5.5 0 01.708.708L8.707 8l5.147 5.146a.5.5 0 01-.708.708L8 8.707l-5.146 5.147a.5.5 0 01-.708-.708L7.293 8 2.146 2.854z"/>
          </svg>
        </button>
      </div>

      <div className="side-panel-content">
        <div className="navigation-section">
          <h3>Quick Navigation</h3>
          <nav className="navigation-list">
            {defaultNavigation.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item)}
                title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.shortcut && (
                  <span className="nav-shortcut">{item.shortcut}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {customUrls.length > 0 && (
          <div className="navigation-section">
            <h3>Custom Links</h3>
            <nav className="navigation-list">
              {customUrls.map((item) => (
                <div key={item.id} className="custom-nav-item">
                  <button
                    className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                    onClick={() => handleNavigation(item)}
                    title={item.label}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                  <button
                    className="remove-custom-url"
                    onClick={() => removeCustomUrl(item.id)}
                    title="Remove"
                    aria-label={`Remove ${item.label}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1"/>
                    </svg>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        )}

        <div className="navigation-section">
          <button
            className="add-custom-url"
            onClick={addCustomUrl}
            title="Add Custom URL"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
            </svg>
            Add Custom Link
          </button>
        </div>

        <div className="navigation-section">
          <h3>Actions</h3>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => onNavigate('https://x.com/compose/tweet')}
              title="Compose Tweet"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15.964.686a.5.5 0 00-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 00-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 00.886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 00-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
              </svg>
              Compose
            </button>

            <button
              className="action-btn"
              onClick={() => window.electronAPI?.invoke('window:reload')}
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 00.908-.417A6 6 0 118 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 01.41-.192L10.533 2.46a.25.25 0 010 .384L8.41 4.658A.25.25 0 018 4.466z"/>
              </svg>
              Refresh
            </button>

            <button
              className="action-btn"
              onClick={() => window.electronAPI?.send('app:toggle-fullscreen')}
              title="Toggle Fullscreen"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 1a.5.5 0 00-.5.5v4a.5.5 0 01-1 0v-4A1.5 1.5 0 011.5 0h4a.5.5 0 010 1h-4zM10 .5a.5.5 0 01.5-.5h4A1.5 1.5 0 0116 1.5v4a.5.5 0 01-1 0v-4a.5.5 0 00-.5-.5h-4a.5.5 0 01-.5-.5zM.5 10a.5.5 0 01.5.5v4a.5.5 0 00.5.5h4a.5.5 0 010 1h-4A1.5 1.5 0 010 14.5v-4a.5.5 0 01.5-.5zm15 0a.5.5 0 01.5.5v4a1.5 1.5 0 01-1.5 1.5h-4a.5.5 0 010-1h4a.5.5 0 00.5-.5v-4a.5.5 0 01.5-.5z"/>
              </svg>
              Fullscreen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};