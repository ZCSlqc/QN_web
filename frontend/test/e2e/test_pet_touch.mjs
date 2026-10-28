import { test, expect } from '../fixtures/app.mjs'
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function gesture(page, start, end, during) {
  const cdp = await page.context().newCDPSession(page)
  const point = position => [{ x: position.x, y: position.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(start) })
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point({ x: start.x + (end.x - start.x)*i/5, y: start.y + (end.y - start.y)*i/5 }) })
  }
  if (during) await during()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('touch stroking shows a hand, stays in place and releases scrolling', async ({ page, app }) => {
  app.allowedPages = ['/index', '/cat']
  await page.goto('/cat')
  await page.locator('.cat-touch').scrollIntoViewIfNeeded()
  await expect(page.locator('.cat-frame')).toBeVisible()
  const box = await page.locator('.cat-touch').boundingBox()
  const scroll = await page.evaluate(() => scrollY)
  await gesture(page, { x: box.x+box.width*.5, y: box.y+box.height*.4 }, { x: box.x+box.width*.6, y: box.y+box.height*.62 }, async () => {
    await expect(page.locator('.petting-hand')).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await expect(page.locator('.cat-wrap')).toHaveClass(/pet/)
  })
  await expect(page.locator('.petting-hand')).toHaveCount(0)
  await page.locator('.hello-card').scrollIntoViewIfNeeded()
  const initial = await page.evaluate(() => scrollY)
  await gesture(page, { x: 15, y: 600 }, { x: 15, y: 300 })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initial)
})

test('touch teaser follows the finger, survives release and exits on its button', async ({ page, app }) => {
  app.allowedPages = ['/index', '/cat']
  await page.goto('/cat')
  await page.getByRole('button', { name: '逗猫棒', exact: true }).tap()
  const box = await page.locator('.pet-room').boundingBox()
  const scroll = await page.evaluate(() => scrollY)
  const target = { x: box.x + box.width*.7, y: Math.min(700, box.y + box.height*.7) }
  await gesture(page, { x: box.x + box.width*.3, y: Math.min(560, box.y + box.height*.5) }, target)
  await expect(page.locator('.pet-room')).toHaveClass(/is-teasing/)
  await expect(page.locator('.petting-hand')).toHaveCount(0)
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
  const toy = await page.locator('.cat-toy').boundingBox()
  expect(Math.abs(toy.x + toy.width/2 - target.x)).toBeLessThan(5)
  await page.waitForTimeout(4500)
  await expect(page.locator('.pet-room')).toHaveClass(/is-teasing/)
  await page.getByRole('button', { name: '逗猫棒', exact: true }).tap()
  await expect(page.locator('.pet-room')).not.toHaveClass(/is-teasing/)
  await expect(page.locator('.cat-toy')).toHaveCount(0)
})
