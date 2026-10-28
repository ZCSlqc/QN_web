import { test, expect } from '../fixtures/app.mjs'

test('administrator protection, user search and complete blessing text', async ({ page, app }) => {
  app.admin = true
  app.blessings[0].content = '这是一条长祝福。'.repeat(30)
  await page.goto('/admin')
  const owner = page.locator('tbody tr').filter({ hasText: '测试管理员' })
  await expect(owner).toContainText('受保护')
  await expect(owner.getByRole('button', { name: '删除' })).toHaveCount(0)
  await page.getByRole('searchbox', { name: '搜索用户名' }).fill('不存在')
  await expect(page.getByText('没有找到这个名字')).toBeVisible()
  await page.getByRole('button', { name: '祝福管理' }).click()
  await page.getByRole('button', { name: '展开全文' }).first().click()
  await expect(page.locator('.blessing-content p').first()).not.toHaveClass(/collapsed/)
})

test('share code stays masked, persists edits, and environment-controlled values are read-only', async ({ page, app }) => {
  app.admin = true
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/admin')
  await page.getByRole('button', { name: '网站设置' }).click()
  await expect(page.locator('#current-share-code')).toHaveValue('••••••••')
  await page.getByRole('button', { name: '随机生成' }).click()
  await expect(page.locator('#new-share-code')).toHaveValue(/^[a-f0-9]{16}$/)
  await page.locator('#new-share-code').fill('new-fixture-code')
  await page.getByRole('button', { name: '保存分享码' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('分享码已保存并立即生效')).toBeVisible()
  expect(app.code).toBe('new-fixture-code')
  await page.getByRole('button', { name: '查看', exact: true }).click()
  await expect(page.locator('#current-share-code')).toHaveValue('new-fixture-code')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  app.editable = false
  await page.reload()
  await page.getByRole('button', { name: '网站设置' }).click()
  await expect(page.getByText('由部署环境管理', { exact: true })).toBeVisible()
  await expect(page.locator('#new-share-code')).toHaveCount(0)
})

test('todo edit, complete and restore', async ({ page, app }) => {
  app.admin = true
  await page.goto('/admin')
  await page.getByRole('button', { name: '待办管理' }).click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await page.locator('#admin-todo-entry').fill('看晚霞')
  await page.locator('.todo-editor').getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('tbody')).toContainText('看晚霞')
  await page.getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '完成心愿', exact: true }).click()
  await expect(page.getByText('暂时没有待办心愿')).toBeVisible()
  await page.getByRole('button', { name: '已完成', exact: true }).click()
  await page.getByRole('button', { name: '恢复待办' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  await expect(page.getByText('还没有已完成的心愿')).toBeVisible()
})
