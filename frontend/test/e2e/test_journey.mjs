import { test, expect } from '../fixtures/app.mjs'

test('wheel zoom advances by half a level and leaves page scrolling outside the map', async ({ page, app }) => {
  app.allowedPages = ['/index', '/journey']
  await page.goto('/journey')
  await page.waitForFunction(() => !!document.querySelector('.map-container')?.__vueParentComponent?.setupState.provinceGroup)
  await page.evaluate(() => { document.querySelector('.map-container').__vueParentComponent.setupState.map.setView([31.23, 121.47], 6, { animate: false }) })
  await page.locator('.map-container').scrollIntoViewIfNeeded()
  const rect = await page.locator('.map-container').boundingBox()
  const initialY = await page.evaluate(() => scrollY)
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.wheel(0, -120)
  await expect.poll(() => page.evaluate(() => document.querySelector('.map-container').__vueParentComponent.setupState.map.getZoom())).toBe(6.5)
  expect(await page.evaluate(() => scrollY)).toBe(initialY)
  await page.mouse.move(5, 300)
  await page.mouse.wheel(0, 180)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialY)
})

test('local fallback, layered municipalities and complete Chinese date ranges', async ({ page, app }) => {
  app.allowedPages = ['/index', '/journey']
  await page.goto('/journey')
  await expect(page.getByRole('switch', { name: '详细底图' })).toHaveAttribute('aria-checked', 'false')
  await page.waitForFunction(() => !!document.querySelector('.map-container')?.__vueParentComponent?.setupState.provinceGroup)
  await page.evaluate(() => { document.querySelector('.map-container').__vueParentComponent.setupState.map.setView([31.23, 121.47], 7, { animate: false }) })
  await page.waitForFunction(() => document.querySelector('.map-container').__vueParentComponent.setupState.visitedLayers.has('310000'))
  expect(await page.evaluate(() => {
    const s = document.querySelector('.map-container').__vueParentComponent.setupState
    return [s.provinceLayers.get('310000').options.fillOpacity, s.visitedLayers.get('310000').options.fillOpacity]
  })).toEqual([0.3, 0.4])
  await page.locator('.journey-record').click()
  await expect(page.locator('.memory')).toContainText('2025/04/19 — 2025/04/20')
})


test('cancelling a city removal leaves journey names and codes intact', async ({ page, app }) => {
  app.admin = true
  app.allowedPages = ['/index', '/journey']
  await page.goto('/journey')
  await page.locator('.journey-record').getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByRole('button', { name: '移除杭州市', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('.record-place')).toHaveText('上海市、杭州市')
  await page.locator('.journey-record').getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('.selected-city')).toHaveCount(2)
})
