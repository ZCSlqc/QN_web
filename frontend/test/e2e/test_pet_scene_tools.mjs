import { test, expect } from '../fixtures/app.mjs'

test('scene toys and food work in place; diary defaults to three with expansion', async ({ page, app }, testInfo) => {
  app.admin = true; app.petCanFeed = true
  app.petFeeds = Array.from({ length: 7 }, (_, i) => ({ id: i+1, actor_name: '琪琪', food: 'treat', kind: 'feed', created_at: '2026-10-28 12:00:00' }))
  await page.goto('/pet')
  await expect(page.locator('.diary-list li')).toHaveCount(3)
  await page.getByRole('button', { name: '显示全部', exact: true }).click()
  await expect(page.locator('.diary-list li')).toHaveCount(7)
  await page.getByRole('button', { name: '收起', exact: true }).click()
  await expect(page.locator('.diary-list li')).toHaveCount(3)
  await page.getByRole('button', { name: '逗猫棒', exact: true }).click()
  await expect(page.locator('.cat-toy img')).toHaveAttribute('src', '/pet/liuyi/interaction/hand-teaser.webp')
  await page.getByRole('button', { name: '玩具老鼠', exact: true }).click()
  await expect(page.locator('.cat-toy img')).toHaveAttribute('src', '/pet/liuyi/icons/toy-mouse.png')
  await page.getByRole('button', { name: '画面内投喂猫条', exact: true }).click()
  await expect.poll(() => app.petInventory.treat).toBe(4)
  await expect(page.getByRole('button', { name: '画面内投喂猫粮' })).toBeDisabled()
  await page.setViewportSize({ width: 320, height: 844 })
  await page.locator('.scene-tools').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('scene-tools-mobile.png') })
})
