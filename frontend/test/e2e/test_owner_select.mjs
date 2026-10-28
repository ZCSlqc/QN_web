import { test, expect } from '../fixtures/app.mjs'

test('wish contributors list owners by nickname and default to the current account', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.getByRole('button', { name: '+ 新增心愿', exact: true }).click()
  const contributor = page.getByRole('combobox', { name: '贡献人' })
  await expect(contributor).toHaveValue('测试管理员')
  await expect(contributor.locator('option:not([disabled])')).toHaveText(['琪琪', '妮妮'])
  await contributor.selectOption('另一位主人')
  await expect(contributor).toHaveValue('另一位主人')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.goto('/admin')
  await expect(page.locator('tbody')).toContainText('主人')
  await page.getByRole('button', { name: '待办管理' }).click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('#admin-todo-user')).toHaveValue('我们')
  await expect(page.locator('#admin-todo-user option:checked')).toContainText('历史记录')
  await page.locator('#admin-todo-user').selectOption('测试管理员')
  await page.locator('.todo-editor').getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => app.todos[0].user).toBe('测试管理员')
})
