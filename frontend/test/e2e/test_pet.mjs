import { test, expect } from '../fixtures/app.mjs'

test('two visual styles preserve shared food and local choice', async ({ page, app }, testInfo) => {
  app.admin = true; app.petCanFeed = true
  await page.goto('/pet')
  await expect(page.getByRole('heading', { name: '爱的小窝', exact: true })).toBeVisible()
  await expect(page.locator('.cat-frame').last()).toHaveAttribute('src', '/pet/liuyi/realistic/pose-0.webp')
  await page.waitForFunction(() => document.querySelector('.cat-touch img')?.naturalWidth > 0)
  await page.getByRole('button', { name: '插画', exact: true }).click()
  await expect(page.locator('.cat-frame').last()).toHaveAttribute('src', '/pet/liuyi/illustrated/pose-0.webp')
  await page.waitForFunction(() => document.querySelector('.cat-touch img')?.complete && document.querySelector('.cat-touch img')?.naturalWidth > 0)
  await page.screenshot({ path: testInfo.outputPath('pet-illustrated-desktop.png'), fullPage: true })
  await page.reload()
  await expect(page.locator('.cat-frame').last()).toHaveAttribute('src', '/pet/liuyi/illustrated/pose-0.webp')
  await page.getByRole('button', { name: '写实', exact: true }).click()
  await page.getByRole('button', { name: '投喂猫条', exact: true }).click()
  await expect(page.locator('.diary-list')).toContainText('测试甲 从背包里拿了一根猫条，喂给六一。')
  expect(app.petInventory.treat).toBe(4)
  await page.screenshot({ path: testInfo.outputPath('pet-realistic-desktop.png'), fullPage: true })
})

test('a lost feed response can be safely retried without double spending', async ({ page, app }) => {
  app.admin = true; app.petCanFeed = true; app.petFailAfterFeedOnce = true
  await page.goto('/pet')
  await page.getByRole('button', { name: '投喂猫罐头', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认这次投喂', exact: true })).toBeVisible()
  expect(app.petInventory.can).toBe(1)
  await page.getByRole('button', { name: '确认这次投喂', exact: true }).click()
  await expect(page.locator('.speech-bubble')).toContainText('没有再拿一份')
  expect(app.petInventory.can).toBe(1)
  expect(app.petFeeds).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('button', { name: '投喂猫罐头', exact: true })).toContainText('1')
})

test('non-couple visitors can pet and play but cannot consume food', async ({ page, app }, testInfo) => {
  app.admin = true // Also verifies that admin access alone does not grant feeding rights.
  app.petCanFeed = false
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pet')
  await page.getByRole('button', { name: '摸摸头', exact: true }).click()
  await expect(page.locator('.speech-bubble')).toContainText('再摸一下')
  await page.getByRole('button', { name: '逗一逗', exact: true }).click()
  await expect(page.locator('.speech-bubble')).toContainText('让我抓一下')
  await expect(page.getByRole('button', { name: '投喂猫粮', exact: true })).toBeDisabled()
  expect(app.petInventory).toEqual({ treat: 5, kibble: 3, can: 2 })
  await page.waitForFunction(() => document.querySelector('.cat-touch img')?.naturalWidth > 0)
  await page.screenshot({ path: testInfo.outputPath('pet-mobile-390.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.cat-frame')).toHaveCount(1)
  expect(await page.locator('.cat-frame').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
})

test('empty pantry and network failure keep friendly interactions available', async ({ page, app }) => {
  app.admin = true; app.petCanFeed = true
  app.petInventory = { treat: 0, kibble: 0, can: 0 }
  app.fail.add('/pet')
  await page.goto('/pet')
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '摸摸头', exact: true }).click()
  await expect(page.locator('.speech-bubble')).toContainText('再摸一下')
  app.fail.clear()
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.getByRole('button', { name: '投喂猫条', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '投喂猫粮', exact: true })).toBeDisabled()
})

test('love nest navigation follows the configured page access', async ({ page, app }) => {
  app.allowedPages = ['/index', '/pet']
  await page.goto('/index')
  await page.getByRole('link', { name: '爱的小窝', exact: true }).click()
  await expect(page).toHaveURL(/\/pet$/)
  await expect(page.locator('.pantry-card')).toContainText('你带来的礼物')
  await expect(page.getByRole('button', { name: '投喂猫粮', exact: true })).toBeDisabled()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index')
  await page.getByRole('button', { name: '切换导航菜单' }).click()
  await page.locator('.mobile-menu').getByRole('link', { name: '爱的小窝', exact: true }).click()
  await expect(page).toHaveURL(/\/pet$/)
})
