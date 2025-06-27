import React, { useState, useRef } from 'react';
import { AppSettings } from '../../../shared/types/ipc';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
  onReset: () => Promise<void>;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onReset,
  onClose,
  theme,
  onThemeChange
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'advanced' | 'about'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await onSave(localSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        setIsLoading(true);
        await onReset();
        onClose();
      } catch (error) {
        console.error('Failed to reset settings:', error);
        alert('Failed to reset settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(localSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `electronx-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setLocalSettings({ ...localSettings, ...importedSettings });
        } catch (error) {
          alert('Invalid settings file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderGeneralTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <h3>Startup</h3>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={localSettings.startMinimized}
            onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
          />
          <span>Start minimized</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={localSettings.autoUpdate}
            onChange={(e) => handleSettingChange('autoUpdate', e.target.checked)}
          />
          <span>Auto-update application</span>
        </label>
      </div>

      <div className="setting-group">
        <h3>Window</h3>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={localSettings.autoHideMenuBar}
            onChange={(e) => handleSettingChange('autoHideMenuBar', e.target.checked)}
          />
          <span>Auto-hide menu bar</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={localSettings.alwaysOnTop}
            onChange={(e) => handleSettingChange('alwaysOnTop', e.target.checked)}
          />
          <span>Always on top</span>
        </label>
      </div>

      <div className="setting-group">
        <h3>Notifications</h3>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={localSettings.enableNotifications}
            onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
          />
          <span>Enable desktop notifications</span>
        </label>
      </div>

      <div className="setting-group">
        <h3>Zoom</h3>
        
        <div className="setting-item">
          <label>Zoom Level: {Math.round(localSettings.zoomLevel * 100)}%</label>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={localSettings.zoomLevel}
            onChange={(e) => handleSettingChange('zoomLevel', parseFloat(e.target.value))}
            className="zoom-slider"
          />
          <div className="zoom-controls">
            <button onClick={() => handleSettingChange('zoomLevel', Math.max(0.25, localSettings.zoomLevel - 0.25))}>
              -
            </button>
            <button onClick={() => handleSettingChange('zoomLevel', 1)}>
              Reset
            </button>
            <button onClick={() => handleSettingChange('zoomLevel', Math.min(3, localSettings.zoomLevel + 0.25))}>
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <h3>Theme</h3>
        
        <div className="theme-selector">
          {(['light', 'dark', 'system'] as const).map((themeOption) => (
            <label key={themeOption} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={themeOption}
                checked={localSettings.theme === themeOption}
                onChange={() => {
                  handleSettingChange('theme', themeOption);
                  onThemeChange(themeOption);
                }}
              />
              <span className="theme-label">
                <div className={`theme-preview theme-preview-${themeOption}`}>
                  <div className="theme-preview-content"></div>
                </div>
                {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <h3>Custom CSS</h3>
        <p className="setting-description">
          Add custom CSS to modify the appearance of X.com. Use with caution.
        </p>
        
        <textarea
          className="custom-css-textarea"
          placeholder="/* Enter your custom CSS here */"
          value={localSettings.customCSS}
          onChange={(e) => handleSettingChange('customCSS', e.target.value)}
          rows={10}
        />
        
        <div className="css-actions">
          <button onClick={() => handleSettingChange('customCSS', '')}>
            Clear CSS
          </button>
          <button onClick={() => {
            const defaultCSS = `/* Hide promoted tweets */
[data-testid="placementTracking"] { display: none !important; }

/* Custom scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-background-secondary); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }`;
            handleSettingChange('customCSS', defaultCSS);
          }}>
            Load Example CSS
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <h3>Content Filtering</h3>
        
        <div className="setting-item">
          <label>Blocked Keywords</label>
          <div className="keyword-manager">
            <div className="keyword-list">
              {localSettings.blockedKeywords.map((keyword, index) => (
                <div key={index} className="keyword-item">
                  <span>{keyword}</span>
                  <button
                    onClick={() => {
                      const newKeywords = localSettings.blockedKeywords.filter((_, i) => i !== index);
                      handleSettingChange('blockedKeywords', newKeywords);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="add-keyword">
              <input
                type="text"
                placeholder="Add keyword to block"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const newKeyword = e.currentTarget.value.trim();
                    if (!localSettings.blockedKeywords.includes(newKeyword)) {
                      handleSettingChange('blockedKeywords', [...localSettings.blockedKeywords, newKeyword]);
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="setting-group">
        <h3>Data Management</h3>
        
        <div className="data-actions">
          <button onClick={handleExportSettings}>
            Export Settings
          </button>
          <button onClick={handleImportSettings}>
            Import Settings
          </button>
          <button
            onClick={async () => {
              if (confirm('This will clear all cached data. Continue?')) {
                try {
                  if (window.electronAPI) {
                    await window.electronAPI.invoke('storage:clear-cache');
                    alert('Cache cleared successfully.');
                  }
                } catch (error) {
                  alert('Failed to clear cache.');
                }
              }
            }}
            className="destructive"
          >
            Clear Cache
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="settings-tab-content">
      <div className="about-content">
        <div className="app-info">
          <h2>ElectronX</h2>
          <p>A secure, cross-platform desktop wrapper for X.com</p>
          <p className="version">Version: {window.versions?.electron || 'Unknown'}</p>
        </div>

        <div className="system-info">
          <h3>System Information</h3>
          <ul>
            <li>Platform: {window.versions?.platform || 'Unknown'}</li>
            <li>Architecture: {window.versions?.arch || 'Unknown'}</li>
            <li>Electron: {window.versions?.electron || 'Unknown'}</li>
            <li>Chrome: {window.versions?.chrome || 'Unknown'}</li>
            <li>Node.js: {window.versions?.node || 'Unknown'}</li>
          </ul>
        </div>

        <div className="links">
          <button
            onClick={() => window.electronAPI?.invoke('url:open-external', { url: 'https://github.com/imagedthat/electronx' })}
          >
            View Source Code
          </button>
          <button
            onClick={() => window.electronAPI?.invoke('url:open-external', { url: 'https://github.com/imagedthat/electronx/issues' })}
          >
            Report Issues
          </button>
        </div>

        <div className="license">
          <h3>License</h3>
          <p>MIT License - Open Source Software</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 11.708-.708L8 7.293l5.146-5.147a.5.5 0 01.708.708L8.707 8l5.147 5.146a.5.5 0 01-.708.708L8 8.707l-5.146 5.147a.5.5 0 01-.708-.708L7.293 8 2.146 2.854z"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="settings-tabs">
            {[
              { id: 'general', label: 'General' },
              { id: 'appearance', label: 'Appearance' },
              { id: 'advanced', label: 'Advanced' },
              { id: 'about', label: 'About' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-content">
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'appearance' && renderAppearanceTab()}
            {activeTab === 'advanced' && renderAdvancedTab()}
            {activeTab === 'about' && renderAboutTab()}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleReset} disabled={isLoading} className="reset-button">
            Reset to Defaults
          </button>
          <button onClick={handleSave} disabled={isLoading} className="save-button">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};