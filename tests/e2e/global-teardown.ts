import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up ElectronX E2E tests...');

  try {
    // Clean up test data directory
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }

    // Clean up environment variables
    delete process.env.ELECTRONX_TEST_MODE;
    delete process.env.ELECTRONX_USER_DATA;

    console.log('✅ E2E test cleanup completed');

  } catch (error) {
    console.error('❌ E2E test cleanup failed:', error);
    // Don't throw here as it would fail the entire test suite
  }
}

export default globalTeardown;