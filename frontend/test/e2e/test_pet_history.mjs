import { test, expect } from '../fixtures/app.mjs'

test('history pages load on demand and polling never downloads the entire history', async ({ page, app }) => {
  app.admin = true
  app.petFeeds = Array.from({ length: 45 }, (_, i) => ({ id: String(i), actor_name: '琪琪', kind: 'feed', food: 'treat', created_at: '2026-10-29 01:00:00' }))
  let historyReads = 0
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/pet/activity') historyReads++ })
  await page.clock.install()
  await page.goto('/pet')
  await expect(page.locator('.diary-list li')).toHaveCount(3)
  expect(historyReads).toBe(0)
  await page.getByRole('button', { name: '显示全部', exact: true }).click()
  await expect(page.locator('.diary-list li')).toHaveCount(20)
  await page.getByRole('button', { name: '加载更多', exact: true }).click()
  await expect(page.locator('.diary-list li')).toHaveCount(40)
  const count = historyReads
  await page.locator('.pet-room').scrollIntoViewIfNeeded()
  await page.clock.fastForward(61000)
  expect(historyReads).toBe(count)
  await page.getByRole('button', { name: '加载更多', exact: true }).click()
  await expect(page.locator('.diary-list li')).toHaveCount(45)
  await expect(page.getByRole('button', { name: '加载更多', exact: true })).toHaveCount(0)
})
