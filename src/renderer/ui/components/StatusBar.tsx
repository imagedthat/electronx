import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  theme,
  onToggleTheme,
  zoomLevel,
  onZoomChange
}) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load system info
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        if (window.electronAPI) {
          const response = await window.electronAPI.invoke('app:get-system-info');
          if (response.success) {
            setSystemInfo(response.data);
          }
        }
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };

    loadSystemInfo();
  }, []);

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="status-connected">
            <circle cx="6" cy="6" r="6"/>
          </svg>
        );
      case 'connecting':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="status-connecting">
            <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2">
              <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'disconnected':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="status-disconnected">
            <circle cx="6" cy="6" r="6"/>
            <path d="M3 3l6 6M9 3L3 9" stroke="white" strokeWidth="1"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const formatZoom = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  const handleZoomClick = () => {
    // Reset to 100% on click
    onZoomChange(1.0);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {/* Connection Status */}
        <div className="status-item connection-status" title={`Connection: ${connectionStatus}`}>
          {getConnectionIcon()}
          <span className="status-text">{connectionStatus}</span>
        </div>

        {/* Platform Info */}
        {systemInfo && (
          <div className="status-item platform-info" title="Platform Information">
            <span className="status-text">
              {systemInfo.platform} {systemInfo.arch}
            </span>
          </div>
        )}

        {/* Version */}
        {systemInfo && (
          <div className="status-item version-info" title="ElectronX Version">
            <span className="status-text">v{systemInfo.version}</span>
          </div>
        )}
      </div>

      <div className="status-center">
        {/* Current URL or Status */}
        <div className="status-item current-url">
          <span className="status-text">X.com</span>
        </div>
      </div>

      <div className="status-right">
        {/* Zoom Level */}
        <div 
          className="status-item zoom-level clickable" 
          onClick={handleZoomClick}
          title="Zoom Level (click to reset)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="5" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <span className="status-text">{formatZoom(zoomLevel)}</span>
        </div>

        {/* Theme Toggle */}
        <div 
          className="status-item theme-toggle clickable"
          onClick={onToggleTheme}
          title={`Current theme: ${theme} (click to toggle)`}
        >
          {theme === 'dark' ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0a6 6 0 104.472 10.045A7.5 7.5 0 016 0z"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="2"/>
              <path d="M6 1v1m0 8v1m5-5h-1m-8 0H1m4.293-3.707l.707.707M9.707 9.707l-.707-.707M2.293 2.293l.707.707m6.414 6.414l.707.707"/>
            </svg>
          )}
          <span className="status-text">{theme}</span>
        </div>

        {/* Current Time */}
        <div className="status-item current-time" title="Current Time">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
          <span className="status-text">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};