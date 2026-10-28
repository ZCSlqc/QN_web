import { test, expect } from '../fixtures/app.mjs'

test('cat sounds require interaction, do not overlap and remember mute', async ({ page, app }) => {
  app.allowedPages = ['/cat']
  await page.addInitScript(() => {
    window.catSounds = []
    HTMLMediaElement.prototype.play = function () { window.catSounds.push(this.src); return Promise.resolve() }
    HTMLMediaElement.prototype.pause = function () {}
  })
  await page.goto('/cat')
  await expect(page.locator('.cat-frame')).toBeVisible()
  expect(await page.evaluate(() => window.catSounds)).toHaveLength(0)
  await page.locator('.cat-touch').click()
  await expect.poll(() => page.evaluate(() => window.catSounds.length)).toBe(1)
  expect(await page.evaluate(() => window.catSounds[0])).toContain('/pet/sounds/pet.mp3')
  await page.getByRole('button', { name: '逗猫棒', exact: true }).click()
  expect(await page.evaluate(() => window.catSounds)).toHaveLength(1)
  await page.getByRole('button', { name: '关闭猫咪音效', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: '开启猫咪音效', exact: true })).toBeVisible()
  await page.locator('.cat-touch').click()
  expect(await page.evaluate(() => window.catSounds)).toHaveLength(0)
})

test('compact letter composition fits without dialog scrolling', async ({ page, app }) => {
  app.admin = true; app.mailbox = true
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/index')
    await page.locator('.mailbox-trigger').click()
    await page.getByRole('button', { name: '写封信', exact: true }).click()
    await expect(page.locator('#mail-body')).toHaveAttribute('rows', '4')
    await expect(page.getByRole('button', { name: '寄给ta', exact: true })).toBeVisible()
    expect(await page.locator('.el-dialog__body:visible').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
  }
})
