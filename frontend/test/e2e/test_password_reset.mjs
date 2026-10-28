import { test, expect } from '../fixtures/app.mjs'

test('admin navigation, personalized greeting and per-user password reset', async ({ page, app }) => {
  app.admin = true
  await page.goto('/admin')
  await expect(page.locator('.nav-bar')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.88)')
  await expect(page.getByRole('heading', { name: '欢迎你测试管理员，打理我们的小世界' })).toBeVisible()
  await expect(page.getByRole('button', { name: '重置密码', exact: true })).toHaveCount(2)
  const guest = page.locator('tbody tr').filter({ hasText: '来访朋友' })
  await guest.getByRole('button', { name: '重置密码' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  expect(app.passwordResets).toEqual([])
  await guest.getByRole('button', { name: '重置密码' }).click()
  await expect(page.locator('.el-message-box')).toContainText('当前分享码')
  await page.locator('.el-message-box').getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.getByText('密码已重置为当前分享码', { exact: true })).toBeVisible()
  expect(app.passwordResets).toEqual([2])
  await expect(page).toHaveURL(/\/admin$/)
  await page.locator('tbody tr').filter({ hasText: '测试管理员' }).getByRole('button', { name: '重置密码' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '重置', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
})
