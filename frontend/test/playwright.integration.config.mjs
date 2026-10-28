import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const localPython = fileURLToPath(new URL(process.platform === 'win32' ? '../../.venv/Scripts/python.exe' : '../../.venv/bin/python', import.meta.url))
const python = process.env.QN_TEST_PYTHON || (existsSync(localPython) ? localPython : 'python')
const apiPort = Number(process.env.QN_INTEGRATION_API_PORT || 8015)
const webPort = Number(process.env.QN_INTEGRATION_WEB_PORT || 7745)
const built = process.env.QN_TEST_BUILT === '1'
export default defineConfig({
  testDir: './integration', testMatch: 'test_*.mjs', workers: 1, timeout: 60000,
  outputDir: `../../artifacts/integration-test-results/${Date.now()}-${process.pid}`,
  use: { baseURL: `http://127.0.0.1:${webPort}`, launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {} },
  webServer: [
    { command: `"${python}" backend/test/run_server.py --port ${apiPort}`, cwd: root, url: `http://127.0.0.1:${apiPort}/health`, reuseExistingServer: false },
    { command: built ? 'npm run serve' : `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`, cwd: root + '/frontend', url: `http://127.0.0.1:${webPort}`, reuseExistingServer: false,
      env: { QN_API_TARGET: `http://127.0.0.1:${apiPort}`, QN_FRONTEND_PORT: String(webPort), CHOKIDAR_USEPOLLING: 'true' } },
  ],
})
