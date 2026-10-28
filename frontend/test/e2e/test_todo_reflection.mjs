import { test, expect } from '../fixtures/app.mjs'

test('completion reflection is visible in completed list and can be edited later', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.locator('.todo-card').getByRole('button', { name: '完成', exact: true }).click()
  await page.locator('#todo-reflection').fill('两京一十三省在琪宝肩上扛着 😏')
  await page.getByRole('button', { name: '完成心愿', exact: true }).click()
  await expect(page.locator('.done-item__reflection')).toHaveText('两京一十三省在琪宝肩上扛着 😏')
  await expect(page.locator('.todo-card')).toHaveCount(0)
  await page.getByRole('button', { name: '修改感想', exact: true }).click()
  await page.locator('#todo-reflection').fill('下次还要一起看 💪')
  await page.getByRole('button', { name: '保存感想', exact: true }).click()
  await expect(page.locator('.done-item__reflection')).toHaveText('下次还要一起看 💪')
  app.admin = false
  await page.reload()
  await expect(page.locator('.done-item__reflection')).toHaveText('下次还要一起看 💪')
  await expect(page.getByRole('button', { name: '修改感想', exact: true })).toHaveCount(0)
})

test('reflection is optional and failed save retains entered text', async ({ page, app }) => {
  app.admin = true
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/index')
  await page.locator('.todo-card').getByRole('button', { name: '完成', exact: true }).click()
  await page.locator('#todo-reflection').fill('这是还没保存的感想')
  app.fail.add('/admin/todos/1/status')
  await page.getByRole('button', { name: '完成心愿', exact: true }).click()
  await expect(page.locator('.reflection-error')).toBeVisible()
  await expect(page.locator('#todo-reflection')).toHaveValue('这是还没保存的感想')
  expect(app.todos[0].done).toBe(false)
  app.fail.clear()
  await page.locator('#todo-reflection').fill('')
  await page.getByRole('button', { name: '完成心愿', exact: true }).click()
  await expect(page.locator('.done-item')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '写点感想', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
