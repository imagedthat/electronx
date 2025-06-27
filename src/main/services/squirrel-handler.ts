import { app } from 'electron';
import { execSync } from 'child_process';
import { basename } from 'path';
import log from 'electron-log';

/**
 * Handle Squirrel.Windows events for auto-updater
 * This is required for Windows NSIS installers
 */
export function handleSquirrelEvent(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  if (process.argv.length === 1) {
    return false;
  }

  const appFolder = process.execPath.substring(0, process.execPath.lastIndexOf('\\'));
  const rootAtomFolder = appFolder.substring(0, appFolder.lastIndexOf('\\'));
  const updateDotExe = `${rootAtomFolder}\\Update.exe`;
  const exeName = basename(process.execPath);

  const squirrelEvent = process.argv[1];

  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      try {
        // Create shortcuts and register file associations
        execSync(`"${updateDotExe}" --createShortcut="${exeName}"`, { timeout: 10000 });
        log.info('Squirrel shortcuts created');
      } catch (error) {
        log.error('Failed to create shortcuts:', error);
      }
      
      setTimeout(() => {
        app.quit();
      }, 1000);
      return true;

    case '--squirrel-uninstall':
      try {
        // Remove shortcuts and file associations
        execSync(`"${updateDotExe}" --removeShortcut="${exeName}"`, { timeout: 10000 });
        log.info('Squirrel shortcuts removed');
      } catch (error) {
        log.error('Failed to remove shortcuts:', error);
      }
      
      setTimeout(() => {
        app.quit();
      }, 1000);
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;

    default:
      return false;
  }
}