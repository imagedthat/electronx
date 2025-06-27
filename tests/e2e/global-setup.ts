import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up ElectronX E2E tests...');

  try {
    // Ensure the application is built
    const distPath = path.join(__dirname, '..', '..', 'dist');
    const mainPath = path.join(distPath, 'main', 'index.js');

    if (!fs.existsSync(mainPath)) {
      console.log('📦 Building application for tests...');
      execSync('npm run build', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
      });
    }

    // Verify build exists
    if (!fs.existsSync(mainPath)) {
      throw new Error('Application build not found. Please run "npm run build" first.');
    }

    // Create test data directory if needed
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.ELECTRONX_TEST_MODE = 'true';
    process.env.ELECTRONX_USER_DATA = path.join(testDataDir, 'userData');

    console.log('✅ E2E test setup completed');

  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  }
}

export default globalSetup;