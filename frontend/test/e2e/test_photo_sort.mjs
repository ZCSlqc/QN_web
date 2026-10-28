import { test, expect } from '../fixtures/app.mjs'

test('direct dragging saves automatically and the compact menu sets a cover', async ({ page, app }) => {
  app.admin = true
  let saved, uploads = 0
  const photos = [1,2,3].map(id => ({ id: String(id), caption: `照片${id}`, thumbnail_url: '/avatars/qiqi.webp' }))
  await page.route('**/api/journeys/1/photos', route => {
    if (route.request().method() === 'POST') uploads++
    return route.fulfill({ json: { data: photos } })
  })
  await page.route('**/api/journeys/1/photo-order', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { status: 'success' } }) })
  await page.goto('/journey')
  await page.getByRole('button', { name: '翻开这段回忆 →' }).click()
  await expect(page.getByRole('button', { name: '调整顺序' })).toHaveCount(0)
  await page.locator('[data-photo-id="1"]').dragTo(page.locator('[data-photo-id="3"]'))
  await expect.poll(() => saved).toEqual({ ids: ['2','3','1'], original_ids: ['1','2','3'] })
  await expect(page.locator('.photo-grid figure').first()).toHaveAttribute('data-photo-id', '2')
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await page.locator('[data-photo-id="1"] summary').click()
  await page.getByRole('button', { name: '设为封面' }).click()
  await expect.poll(() => saved.ids).toEqual(['1','2','3'])
  expect(uploads).toBe(0)
})

test('failed automatic save restores order and normal photo controls', async ({ page, app }) => {
  app.admin = true
  const photos = [1,2].map(id => ({ id: String(id), caption: `照片${id}`, thumbnail_url: '/avatars/qiqi.webp' }))
  await page.route('**/api/journeys/1/photos', route => route.fulfill({ json: { data: photos } }))
  await page.route('**/api/journeys/1/photo-order', route => route.fulfill({ status: 409, json: { detail: '照片列表已变化，请刷新' } }))
  await page.goto('/journey')
  await page.getByRole('button', { name: '翻开这段回忆 →' }).click()
  await page.locator('[data-photo-id="1"]').dragTo(page.locator('[data-photo-id="2"]'))
  await expect(page.locator('.el-message--error')).toContainText('照片列表已变化')
  await expect(page.locator('.photo-grid figure').first()).toHaveAttribute('data-photo-id','1')
  await expect(page.getByRole('button', { name: '关闭回忆' })).toBeEnabled()
})
