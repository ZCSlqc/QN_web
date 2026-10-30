import { test, expect } from '../fixtures/app.mjs'

test('admin backpack only shows total and compact copy, never visitor rewards', async ({ page, app }) => {
  app.admin = true; app.petCanFeed = true
  await page.goto('/pet')
  await expect(page.getByRole('heading', { name: '我们的小背包' })).toBeVisible()
  await expect(page.locator('.pantry-card')).toContainText('两个人一起攒，一起花')
  await expect(page.locator('.pantry-sources')).toHaveText('上传新照片 → 猫条 | 完成心愿 → 猫粮 | 完成旅程 → 罐头')
  await expect(page.locator('.visitor-treats')).toHaveCount(0)
  await expect(page.locator('.pantry-card')).not.toContainText('自己')
  await expect(page.locator('.pantry-card')).not.toContainText('重复领取')
})

test('visitor interactions and reward are together; link directly opens blessing dialog', async ({ page, app }) => {
  app.allowedPages = ['/index', '/pet']
  await page.goto('/pet')
  await expect(page.locator('.pantry-card .gift-reward-note')).toBeVisible()
  await expect(page.getByRole('heading', { name: '你带来的礼物' })).toBeVisible()
  await page.getByRole('link', { name: '去送祝福，攒根猫条 →' }).click()
  await expect(page.getByRole('dialog', { name: '留下你的祝福' })).toBeVisible()
  await page.getByRole('textbox', { name: '祝福内容' }).fill('每天都有小小的开心。')
  await page.getByRole('button', { name: '送出祝福', exact: true }).click()
  await expect(page.getByText('祝福送到啦，猫条已放进你的口袋。', { exact: true })).toBeVisible()
})

test('an uncertain feed survives refresh and is isolated per account', async ({ page, app }) => {
  app.admin = true; app.petCanFeed = true; app.petFailAfterFeedOnce = true
  await page.goto('/pet')
  await page.getByRole('button', { name: '投喂猫罐头', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认这次投喂' })).toBeVisible()
  expect(app.petInventory.can).toBe(1)
  app.viewerId = '5468a212-f1bd-41e8-b438-d96c4f5e1122'
  await page.reload()
  await expect(page.locator('.pantry-card')).toBeVisible()
  await expect(page.getByRole('button', { name: '确认这次投喂' })).toHaveCount(0)
  app.viewerId = '1de66a0c-30b4-417b-a95e-e6daf070bcb1'
  await page.reload()
  await page.getByRole('button', { name: '确认这次投喂' }).click()
  await expect(page.locator('.speech-bubble')).toContainText('没有再拿一份')
  expect(app.petInventory.can).toBe(1)
  expect(app.petFeeds).toHaveLength(1)
})

test('users set a nickname and administrators see a dedicated nickname column', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.getByRole('button', { name: '账号', exact: true }).click()
  await page.locator('#account-nickname').fill('小橘子')
  await page.getByRole('button', { name: '保存昵称', exact: true }).click()
  await expect(page.getByText('昵称已保存', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/admin')
  await expect(page.locator('thead th').nth(0)).toHaveText('用户名')
  await expect(page.locator('thead th').nth(1)).toHaveText('昵称')
  await expect(page.locator('tbody tr').first()).toContainText('小橘子')
})
