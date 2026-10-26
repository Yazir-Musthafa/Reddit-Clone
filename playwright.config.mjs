import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.mjs',
    workers: 1,
    timeout: 60000,
    expect: { timeout: 10000 },
    globalSetup: './tests/setup.mjs',
    use: { baseURL: 'http://127.0.0.1:3002', storageState: '.data/react-test-session.json', trace: 'retain-on-failure' },
    webServer: {
        command: 'npm run build && PORT=3002 MONGODB_URI=mongodb://127.0.0.1:27017/reddit_clone_react_test node server/server.js',
        url: 'http://127.0.0.1:3002/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 60000
    }
});
