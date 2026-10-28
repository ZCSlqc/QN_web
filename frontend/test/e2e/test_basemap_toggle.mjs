import { test, expect } from '../fixtures/app.mjs'

test('online map is opt-in and resets on refresh while local map remains usable', async ({ page, app }) => {
  app.admin = true
  const onlineRequests = []
  page.on('request', request => { if (/openFreeMap|tiles\.openfreemap|maplibre-gl-worker/.test(request.url())) onlineRequests.push(request.url()) })
  await page.goto('/journey')
  await page.waitForFunction(() => !!document.querySelector('.map-container')?.__vueParentComponent?.setupState.cityGroup)
  const toggle = page.getByRole('switch', { name: '详细底图' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  expect(onlineRequests).toEqual([])
  await expect(page.locator('.map-legend')).toHaveText('已到访预定')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => onlineRequests.length).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: '底图加载失败，点击重试' })).toBeVisible({ timeout: 15000 })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('button', { name: '底图加载失败，点击重试' })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(toggle).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  onlineRequests.length = 0
  await page.reload()
  await page.waitForFunction(() => !!document.querySelector('.map-container')?.__vueParentComponent?.setupState.cityGroup)
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  expect(onlineRequests).toEqual([])
})

test('turning off during import prevents the delayed online map from attaching', async ({ page, app }) => {
  app.admin = true
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/src/features/journey/openFreeMap*', async route => {
    await gate
    await route.fulfill({ contentType: 'application/javascript', body: 'export function attachOpenFreeMap() { window.unexpectedMapAttach = true; return () => {} }' })
  })
  await page.goto('/journey')
  const toggle = page.getByRole('switch', { name: '详细底图' })
  await toggle.click()
  await expect(page.getByRole('status', { name: '正在加载底图' })).toBeVisible()
  await toggle.click()
  release()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect.poll(() => page.evaluate(() => document.querySelector('.map-container').__vueParentComponent.setupState.basemapStatus)).toBe('off')
  expect(await page.evaluate(() => !!window.unexpectedMapAttach)).toBe(false)
})
