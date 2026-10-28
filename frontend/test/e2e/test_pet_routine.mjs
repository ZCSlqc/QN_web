import { test, expect } from '../fixtures/app.mjs'

test('Beijing dawn and dusk switch without refreshing, regardless of browser timezone', async ({ page, app }, testInfo) => {
  app.allowedPages = ['/cat']
  await page.clock.install({ time: new Date('2026-10-28T09:59:59Z') })
  await page.goto('/cat')
  await expect(page.locator('.pet-room')).not.toHaveClass(/night-room/)
  await page.clock.runFor(2000)
  await expect(page.locator('.pet-room')).toHaveClass(/night-room/)
  await expect(page.locator('.cat-frame')).toBeVisible()
  await expect(page.locator('.scene-food-image')).toBeVisible()
  await page.clock.runFor(500)
  await page.screenshot({ path: testInfo.outputPath('pet-night.png') })
  await page.clock.setSystemTime(new Date('2026-10-28T21:59:59Z'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.clock.runFor(2000)
  await expect(page.locator('.pet-room')).not.toHaveClass(/night-room/)
})

for (const [name, action, duration] of [['猫条', 'treat', 4000], ['猫粮', 'kibble', 7000], ['猫罐头', 'can', 10000]]) {
  test(`${name} keeps eating for its configured duration and spends once`, async ({ page, app }) => {
    app.admin = true; app.petCanFeed = true
    await page.clock.install()
    await page.goto('/cat')
    await page.getByRole('button', { name: `画面内投喂${name}`, exact: true }).click()
    await expect(page.locator('.cat-wrap')).toHaveClass(new RegExp(`\\b${action}\\b`))
    await page.clock.runFor(duration - 1000)
    await expect(page.locator('.cat-wrap')).toHaveClass(new RegExp(`\\b${action}\\b`))
    await expect(page.getByRole('button', { name: `画面内投喂${name}`, exact: true })).toBeDisabled()
    await page.clock.runFor(1600)
    await expect(page.locator('.cat-wrap')).toHaveClass(/\bidle\b/)
    expect(app.petFeeds).toHaveLength(1)
  })
}

test('unattended cat sleeps and wakes on its own with a current-state caption', async ({ page, app }) => {
  app.allowedPages = ['/cat']
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto('/cat')
  await page.locator('.pet-room').scrollIntoViewIfNeeded()
  await expect(page.locator('.cat-wrap')).toHaveClass(/\bidle\b/)
  await page.clock.runFor(100000)
  await expect(page.locator('.sleeping-cat')).toBeVisible()
  await expect(page.locator('.room-caption')).toHaveText('六一小朋友·睡觉中')
  await expect(page.locator('.speech-bubble')).toHaveCount(0)
  await page.clock.runFor(90000)
  await expect(page.locator('.sleeping-cat')).toHaveCount(0)
  await expect(page.locator('.room-caption')).toHaveText('六一小朋友·发会儿呆')
})
