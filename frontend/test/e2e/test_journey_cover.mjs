import { test, expect } from '../fixtures/app.mjs'

test('portrait covers split equally and memory thumbnails stay compact', async ({ page, app }) => {
  app.admin = true
  const portrait = { id: 'p', width: 600, height: 900, thumbnail_url: '/index/avatars/qiqi.webp', url: '/index/avatars/qiqi.webp' }
  const landscape = { ...portrait, id: 'l', width: 900, height: 600 }
  const base = app.journeys[0]
  app.journeys = [
    { ...base, id: 1, cover: portrait, cover_photos: [portrait, landscape], photo_count: 2 },
    { ...base, id: 2, cover: portrait, cover_photos: [portrait], photo_count: 1 },
    { ...base, id: 3, cover: landscape, cover_photos: [landscape, portrait], photo_count: 2 },
  ]
  await page.route('**/api/journeys/1/photos', route => route.fulfill({ json: { data: [portrait, landscape] } }))
  await page.goto('/journey')
  const covers = page.locator('.record-cover')
  await expect(covers.nth(0).locator('.record-cover-cell')).toHaveCount(2)
  await expect(covers.nth(1)).toHaveClass(/split-cover/)
  await expect(covers.nth(1).locator('.record-cover-cell')).toHaveCount(1)
  await expect(covers.nth(2)).not.toHaveClass(/split-cover/)
  await expect(covers.nth(2).locator('.record-cover-cell')).toHaveCount(1)
  const widths = await covers.nth(0).locator('.record-cover-cell').evaluateAll(items => items.map(el => el.getBoundingClientRect().width))
  expect(widths[0]).toBeCloseTo(widths[1], 0)
  await expect(covers.nth(0)).toHaveCSS('column-gap', '6px')
  await expect(covers.nth(0).locator('.record-cover-cell').first()).toHaveCSS('border-radius', '10px')
  await expect(covers.nth(1).locator('.record-cover-add')).toContainText('待添加')
  const chooserEvent = page.waitForEvent('filechooser')
  await covers.nth(1).getByRole('button', { name: '添加旅程照片' }).click()
  const chooser = await chooserEvent
  expect(chooser.isMultiple()).toBe(true)
  await page.getByRole('button', { name: '关闭回忆' }).click()
  await page.getByRole('button', { name: '翻开这段回忆 →' }).first().click()
  await expect(page.locator('.photo-preview').first()).toHaveCSS('width', '128px')
  await expect(page.locator('.photo-preview').first()).toHaveCSS('height', '128px')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.photo-preview').first()).toHaveCSS('width', '96px')
  await expect(page.locator('.photo-preview').first()).toHaveCSS('height', '96px')
})
