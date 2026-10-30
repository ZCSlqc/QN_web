import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { artifactPath } from './artifactPath.mjs'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))
const port = Number(process.env.QN_TEST_PORT || 7731)
const runId = `${Date.now()}-${process.pid}`
export default defineConfig({
  testDir: './e2e',
  testMatch: 'test_*.mjs',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  outputDir: artifactPath(`frontend-test-results/${runId}`),
  reporter: [['list'], ['html', { outputFolder: artifactPath(`frontend-test-report/${runId}`), open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: frontendRoot,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { CHOKIDAR_USEPOLLING: 'true', CHOKIDAR_INTERVAL: '200' },
  },
})
