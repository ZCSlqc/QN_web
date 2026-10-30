import { artifactPath } from '../artifactPath.mjs';
import { test, expect } from '../fixtures/app.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

test('measure cold cat page image transfers', async ({ page, app }) => {
  app.admin = true; app.petCanFeed = true
  await page.goto('/pet')
  await page.locator('.cat-friends').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => [...document.querySelectorAll('.cat-friends img')].every(image => image.complete && image.naturalWidth > 0))
  await expect(page.locator('.cat-frame')).toBeVisible()
  await page.waitForTimeout(1500)
  const entries = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /\.(png|webp|jpg)(\?|$)/.test(r.name)).map(r => ({ path: new URL(r.name).pathname, bytes: r.encodedBodySize })))
  const report = { images: entries.length, bytes: entries.reduce((sum, r) => sum + r.bytes, 0), resources: entries }
  const root = artifactPath('bandwidth') + '/'
  mkdirSync(root, { recursive: true })
  writeFileSync(`${root}${process.env.QN_BANDWIDTH_LABEL || 'current'}.json`, JSON.stringify(report, null, 2))
  console.log(`Cold cat page: ${report.images} images, ${report.bytes} encoded bytes`)
})

test('static resources revalidate without bodies and maps transfer compressed', async ({ request }) => {
  const image = await request.get('/pet/liuyi/friends/anan.webp')
  expect(image.ok()).toBe(true)
  expect(image.headers()['cache-control']).toContain('must-revalidate')
  const unchanged = await request.get('/pet/liuyi/friends/anan.webp', { headers: { 'If-None-Match': image.headers().etag } })
  expect(unchanged.status()).toBe(304)
  expect((await unchanged.body()).length).toBe(0)
  const plain = await request.get('/journey/maps/china/city.geojson', { headers: { 'Accept-Encoding': 'identity' } })
  const compressed = await request.get('/journey/maps/china/city.geojson', { headers: { 'Accept-Encoding': 'gzip' } })
  expect(compressed.headers()['content-encoding']).toBe('gzip')
  expect(Number(compressed.headers()['content-length'])).toBeLessThan(Number(plain.headers()['content-length']) / 2)
  expect(compressed.headers().vary).toBe('Accept-Encoding')
  const disabled = await request.get('/journey/maps/china/city.geojson', { headers: { 'Accept-Encoding': 'gzip;q=0' } })
  expect(disabled.headers()['content-encoding']).toBeUndefined()
})

test('cat does not download an unused visual style', async ({ page, app }) => {
  app.admin = true
  const requested = []
  page.on('request', request => requested.push(request.url()))
  await page.goto('/pet')
  await expect(page.locator('.cat-frame')).toBeVisible()
  expect(requested.filter(url => /illustrated\/(pose|walk)/.test(url))).toEqual([])
  await page.getByRole('button', { name: '插画', exact: true }).click()
  await expect(page.locator('.cat-frame[src*="illustrated"]')).toBeVisible()
  await expect.poll(() => requested.some(url => url.includes('illustrated/walk-0'))).toBe(true)
})

test('journey viewer only fetches current and next preview, and switches without refetching', async ({ page, app }) => {
  app.admin = true
  const file = fileURLToPath(new URL('../fixtures/images/photo-one.webp', import.meta.url))
  const photos = Array.from({ length: 5 }, (_, i) => ({ id: String(i), caption: '', thumbnail_url: `/api/preview-test/${i}/thumbnail`, url: `/api/preview-test/${i}/image`, display_url: `/api/preview-test/${i}/display` }))
  const requested = []
  await page.route('**/api/preview-test/**', route => {
    requested.push(new URL(route.request().url()).pathname)
    return route.fulfill({ path: file, contentType: 'image/webp' })
  })
  await page.route('**/api/journeys/1/photos', route => route.fulfill({ json: { data: photos } }))
  await page.goto('/journey')
  await page.getByRole('button', { name: '翻开这段回忆 →' }).click()
  await page.getByRole('button', { name: '放大第1张照片' }).click()
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => requested.filter(path => path.endsWith('/display')).length).toBe(2)
  expect(requested.some(path => path.endsWith('/image'))).toBe(false)
  await page.locator('.el-image-viewer__next').click()
  await expect.poll(() => requested.filter(path => path.endsWith('/display')).length).toBe(3)
  await page.locator('.el-image-viewer__prev').click()
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute('src', /^blob:/)
  expect(requested.filter(path => path.endsWith('/display')).length).toBe(3)
  await page.locator('.el-image-viewer__close').click()
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
})
