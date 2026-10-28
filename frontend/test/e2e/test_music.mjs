import { test, expect } from '../fixtures/app.mjs'

test('music keeps its audio element and progress across admin and map navigation', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  const audio = page.locator('audio')
  await page.getByRole('button', { name: '播放音乐', exact: true }).click()
  await expect.poll(() => audio.evaluate(el => el.currentTime)).toBeGreaterThan(0)
  await audio.evaluate(el => { window.__originalAudio = el; el.currentTime = 20 })

  await page.locator('.nav-account-actions').getByRole('link', { name: '管理', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(audio).toHaveCount(1)
  expect(await audio.evaluate(el => el === window.__originalAudio && !el.paused && el.currentTime >= 20)).toBe(true)

  await page.getByRole('link', { name: '管理旅程 →' }).click()
  await expect(page).toHaveURL(/\/journey$/)
  expect(await audio.evaluate(el => el === window.__originalAudio && !el.paused && el.currentTime >= 20)).toBe(true)
  await page.getByRole('button', { name: '暂停音乐', exact: true }).click()
  await expect.poll(() => audio.evaluate(el => el.paused)).toBe(true)
  const pausedTime = await audio.evaluate(el => el.currentTime)

  await page.locator('.nav-links').getByRole('link', { name: '爱的首页' }).click()
  await expect(page).toHaveURL(/\/index$/)
  expect(await audio.evaluate(el => el === window.__originalAudio && el.paused)).toBe(true)
  expect(await audio.evaluate(el => el.currentTime)).toBeCloseTo(pausedTime, 1)
  await page.getByRole('button', { name: '播放音乐', exact: true }).click()
  await expect.poll(() => audio.evaluate(el => el.currentTime)).toBeGreaterThan(pausedTime)
})
