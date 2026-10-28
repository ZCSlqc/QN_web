import { test, expect } from '../fixtures/app.mjs'
import { fileURLToPath } from 'node:url'

for (const example of [
  { status: 400, data: { detail: '无法读取这张照片，请选择有效的 JPG、PNG 或 WebP 文件' }, expected: '无法读取这张照片' },
  { status: 500, data: null, expected: '服务器处理失败' },
  { status: 422, data: { detail: [{ loc: ['body', 'file'], msg: 'Field required' }] }, expected: 'file：Field required' },
]) {
  test(`journey upload visibly reports HTTP ${example.status} and preserves retry`, async ({ page, app }) => {
    app.admin = true
    await page.route('**/api/journeys/1/photos', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { data: [] } })
      return route.fulfill({ status: example.status, ...(example.data ? { json: example.data } : { body: 'Internal Server Error', contentType: 'text/plain' }) })
    })
    await page.goto('/journey')
    await page.getByRole('button', { name: '翻开这段回忆 →' }).click()
    await page.locator('.upload-label input').setInputFiles(fileURLToPath(new URL('../fixtures/images/photo-one.webp', import.meta.url)))
    await expect(page.locator('.upload-error-summary')).toBeVisible()
    await expect(page.locator('.upload-error-summary')).toContainText(example.expected)
    await expect(page.locator('.upload-error-summary')).toContainText(`HTTP ${example.status}`)
    await expect(page.locator('.el-message--error')).toContainText(example.expected)
    await expect(page.getByRole('button', { name: '重试', exact: true })).toBeEnabled()
  })
}
