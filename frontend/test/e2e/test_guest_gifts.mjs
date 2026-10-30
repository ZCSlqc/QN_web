import { test, expect } from '../fixtures/app.mjs'

test('guest gift card matches owner layout without exposing owner inventory', async ({ page, app }) => {
  app.allowedPages = ['/index', '/pet']; app.personalTreats = 2
  await page.goto('/pet')
  await expect(page.getByRole('heading', { name: '你带来的礼物' })).toBeVisible()
  await expect(page.locator('.pantry-card .food-item')).toHaveCount(3)
  await expect(page.locator('.pantry-card .treat .food-count')).toContainText('2')
  for (const name of ['猫粮', '猫罐头']) {
    const item = page.getByRole('button', { name: `投喂${name}`, exact: true })
    await expect(item).toBeDisabled()
    await expect(item).toContainText('主人专属，粮库未开放')
    await expect(item.locator('.food-count')).toHaveCount(0)
    await expect(page.getByRole('button', { name: `画面内投喂${name}`, exact: true })).toHaveCount(0)
  }
  await expect(page.locator('.hello-card .reward-rule')).toHaveCount(0)
  await expect(page.locator('.pantry-card .gift-reward-note')).toBeVisible()
  await page.getByRole('button', { name: '投喂猫条', exact: true }).click()
  await expect.poll(() => app.personalTreats).toBe(1)
  expect(app.petInventory).toEqual({ treat: 5, kibble: 3, can: 2 })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
