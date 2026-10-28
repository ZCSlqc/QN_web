import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

test('memory reading is separate from editing and trip photos upload, enlarge and delete', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', route => route.abort())
  const login = await page.request.post('/api/login_process', { form: { username: '集成测试甲', userpwd: 'integration-password' } })
  const token = (await login.json()).token
  await page.addInitScript(value => localStorage.setItem('token', value), token)
  const headers = { Authorization: `Bearer ${token}` }
  const notes = '这是一段完整的旅行回忆。'.repeat(25)
  const result = await page.request.post('/api/journeys', { headers, form: { name: '["南京市"]', adcodes: '["320100"]', departure_date: '2025-06-01', return_date: '2025-06-02', checkin_points: '玄武湖', event: '一起散步', notes } })
  const id = (await result.json()).id
  await page.goto('/journey')
  const card = page.locator('.journey-record').filter({ hasText: '南京市' })
  await card.getByRole('button', { name: '翻开这段回忆 →' }).click()
  await expect(page.locator('.memory-details')).toContainText(notes)
  await expect(page.locator('#notes')).toHaveCount(0)
  const image = fileURLToPath(new URL('../fixtures/images/photo-one.webp', import.meta.url))
  const { readFileSync } = await import('node:fs')
  const bytes = [[...readFileSync(image)], [...readFileSync(fileURLToPath(new URL('../fixtures/images/photo-two.webp', import.meta.url)))]]
  const transfer = await page.evaluateHandle(bytes => {
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array(bytes[0])], 'trip-one.webp', { type: 'image/webp' }))
    data.items.add(new File([new Uint8Array(bytes[1])], 'trip-two.webp', { type: 'image/webp' }))
    return data
  }, bytes)
  await page.locator('.memory-photos').dispatchEvent('dragover', { dataTransfer: transfer })
  await expect(page.locator('.memory-photos')).toHaveClass(/dragging/)
  await page.locator('.memory-photos').dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.locator('.photo-grid figure')).toHaveCount(2)
  await expect(page.locator('.photo-grid img').first()).toBeVisible()
  await page.locator('.photo-menu summary').first().click()
  await page.getByRole('button', { name: '编辑说明', exact: true }).click()
  await page.locator('.el-message-box input').fill('湖边的合照')
  await page.locator('.el-message-box').getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.photo-grid figcaption')).toContainText('湖边的合照')
  await page.getByRole('button', { name: '放大第1张照片' }).click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await page.locator('.el-image-viewer__close').click()
  await page.getByRole('button', { name: '关闭回忆' }).click()
  await expect(card.locator('.record-cover')).toContainText('2 张照片')
  await card.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('#notes')).toHaveValue(notes)
  await expect(page.locator('.memory')).toHaveCount(0)
  await page.locator('.journey-modal__foot').getByRole('button', { name: '取消', exact: true }).click()
  await card.getByRole('button', { name: '翻开这段回忆 →' }).click()
  await page.locator('.photo-menu summary').first().click()
  await page.getByRole('button', { name: '删除照片', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.locator('.photo-grid figure')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const tripPhotos = (await (await page.request.get(`/api/journeys/${id}/photos`, { headers })).json()).data
  const album = (await (await page.request.get('/api/photos')).json()).data
  expect(album.some(photo => photo.id === tripPhotos[0].id)).toBe(false)
  await page.request.delete(`/api/journeys/${id}`, { headers })
})
