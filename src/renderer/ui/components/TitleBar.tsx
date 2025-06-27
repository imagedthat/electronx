import React from 'react';

interface TitleBarProps {
  title: string;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onToggleSidePanel: () => void;
  onOpenSettings: () => void;
  onReload: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  showSidePanel: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  title,
  onMinimize,
  onMaximize,
  onClose,
  onToggleFullscreen,
  onToggleSidePanel,
  onOpenSettings,
  onReload,
  onGoBack,
  onGoForward,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showSidePanel
}) => {
  const isMacOS = window.platform?.isMacOS || navigator.platform.toLowerCase().includes('mac');

  return (
    <div className="title-bar" data-platform={window.platform?.current || process.platform}>
      {/* macOS Traffic Lights */}
      {isMacOS && (
        <div className="title-bar-controls-mac">
          <button
            className="title-bar-button close"
            onClick={onClose}
            title="Close"
            aria-label="Close window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="title-bar-button minimize"
            onClick={onMinimize}
            title="Minimize"
            aria-label="Minimize window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M2 6H10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="title-bar-button maximize"
            onClick={onMaximize}
            title="Maximize"
            aria-label="Maximize window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M2 2L10 10M10 2L2 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="title-bar-navigation">
        <button
          className="nav-button"
          onClick={onGoBack}
          title="Go Back"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.5 2.5L3 8l5.5 5.5 1-1L5.5 8.5H13v-1H5.5L9.5 3.5l-1-1z"/>
          </svg>
        </button>
        
        <button
          className="nav-button"
          onClick={onGoForward}
          title="Go Forward"
          aria-label="Go forward"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.5 2.5L13 8l-5.5 5.5-1-1L10.5 8.5H3v-1h7.5L6.5 3.5l1-1z"/>
          </svg>
        </button>
        
        <button
          className="nav-button"
          onClick={onReload}
          title="Reload (Ctrl+R)"
          aria-label="Reload page"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192L10.533 2.46a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="title-bar-title">
        <span className="title-text">{title}</span>
      </div>

      {/* Action Buttons */}
      <div className="title-bar-actions">
        <button
          className={`action-button ${showSidePanel ? 'active' : ''}`}
          onClick={onToggleSidePanel}
          title="Toggle Side Panel"
          aria-label="Toggle side panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v11A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-11zm1.5-.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-3z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13a.5.5 0 0 1 .5-.5z"/>
            <path d="M11 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-11zm1 .5v10h2v-10h-2z"/>
          </svg>
        </button>

        <div className="zoom-controls">
          <button
            className="zoom-button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl+-)"
            aria-label="Zoom out"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 7h8v1H3z"/>
            </svg>
          </button>
          
          <button
            className="zoom-button"
            onClick={onResetZoom}
            title="Reset Zoom (Ctrl+0)"
            aria-label="Reset zoom"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="7" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
          
          <button
            className="zoom-button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl++)"
            aria-label="Zoom in"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
        </div>

        <button
          className="action-button"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          aria-label="Open settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
      </div>

      {/* Windows/Linux Controls */}
      {!isMacOS && (
        <div className="title-bar-controls-win">
          <button
            className="title-bar-button minimize"
            onClick={onMinimize}
            title="Minimize"
            aria-label="Minimize window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
          
          <button
            className="title-bar-button maximize"
            onClick={onMaximize}
            title="Maximize"
            aria-label="Maximize window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
          
          <button
            className="title-bar-button close"
            onClick={onClose}
            title="Close"
            aria-label="Close window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};