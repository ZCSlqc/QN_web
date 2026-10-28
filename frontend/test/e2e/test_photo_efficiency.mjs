import { test, expect } from '../fixtures/app.mjs'
import { fileURLToPath } from 'node:url'

test('private image memory cache reuses reads and isolates accounts', async ({ page, app }) => {
  app.admin = true
  let downloads = 0
  const file = fileURLToPath(new URL('../fixtures/images/photo-one.webp', import.meta.url))
  await page.route('**/api/photos/cache-test/small', route => { downloads++; return route.fulfill({ path: file, contentType: 'image/webp' }) })
  await page.goto('/index')
  await page.evaluate(async () => {
    const { privatePhoto } = await import('/src/features/journey/privatePhotoCache.js')
    await privatePhoto('/api/photos/cache-test/small')
    await privatePhoto('/api/photos/cache-test/small')
  })
  expect(downloads).toBe(1)
  await page.evaluate(async () => {
    const { privatePhoto, invalidatePrivatePhoto } = await import('/src/features/journey/privatePhotoCache.js')
    invalidatePrivatePhoto('cache-test')
    await privatePhoto('/api/photos/cache-test/small')
  })
  expect(downloads).toBe(2)
  await page.evaluate(async () => {
    localStorage.setItem('token', 'different-account')
    const { privatePhoto } = await import('/src/features/journey/privatePhotoCache.js')
    await privatePhoto('/api/photos/cache-test/small')
  })
  expect(downloads).toBe(3)
})

test('page identity is reused and cat polling pauses offscreen', async ({ page, app }) => {
  app.admin = true
  let profiles = 0, petReads = 0
  page.on('request', request => {
    const path = new URL(request.url()).pathname
    if (path === '/api/me') profiles++
    if (path === '/api/pet') petReads++
  })
  await page.clock.install()
  await page.goto('/cat')
  await expect(page.locator('.pet-room')).toBeVisible()
  await expect.poll(() => petReads).toBeGreaterThan(0)
  expect(profiles).toBe(1)
  await page.locator('.pet-footer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const before = petReads
  await page.clock.fastForward(61000)
  expect(petReads).toBe(before)
  await page.locator('.pet-room').scrollIntoViewIfNeeded()
  await expect.poll(() => petReads).toBeGreaterThan(before)
})

test.describe('mobile sorting', () => {
  test.use({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true })
  test('swipe scrolls, long press sorts, undo restores', async ({ page, app }) => {
    app.admin = true
    const photos = Array.from({ length: 18 }, (_, index) => ({ id: String(index), thumbnail_url: '/avatars/qiqi.webp' }))
    let saved
    await page.route('**/api/journeys/1/photos', route => route.fulfill({ json: { data: photos } }))
    await page.route('**/api/journeys/1/photo-order', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { status: 'success' } }) })
    await page.goto('/journey')
    await page.getByRole('button', { name: '翻开这段回忆 →' }).click()
    const cdp = await page.context().newCDPSession(page)
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 4, radiusY: 4 }] })
    await page.locator('[data-photo-id="0"]').scrollIntoViewIfNeeded()
    let box = await page.locator('[data-photo-id="0"]').boundingBox()
    const before = await page.locator('.el-dialog__body').evaluate(el => el.scrollTop)
    await touch('touchStart', box.x+35, box.y+70)
    await touch('touchMove', box.x+35, box.y+20)
    await touch('touchEnd')
    await expect.poll(() => page.locator('.el-dialog__body').evaluate(el => el.scrollTop)).toBeGreaterThan(before)
    expect(saved).toBeUndefined()
    await page.locator('[data-photo-id="0"]').scrollIntoViewIfNeeded()
    box = await page.locator('[data-photo-id="0"]').boundingBox()
    const target = await page.locator('[data-photo-id="1"]').boundingBox()
    await touch('touchStart', box.x+35, box.y+45)
    await page.waitForTimeout(450)
    await touch('touchMove', target.x+35, target.y+45)
    await touch('touchEnd')
    await expect.poll(() => saved?.ids[0]).toBe('1')
    await page.getByRole('button', { name: '撤销', exact: true }).click()
    await expect.poll(() => saved?.ids[0]).toBe('0')
    await cdp.detach()
  })
})
