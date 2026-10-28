import { test, expect } from '../fixtures/app.mjs'

test('ordinary users are locked to index and see only the three home sections', async ({ page, app }) => {
  for (const path of ['/journey', '/admin', '/future-page', '/login']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/index$/)
    await expect(page.locator('.map-container')).toHaveCount(0)
  }
  await expect(page.locator('.nav-links a')).toHaveText(['爱的首页', '爱的故事', '爱的相册'])
  await expect(page.getByRole('link', { name: '查看足迹 →' })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '切换导航菜单' }).click()
  await expect(page.locator('.mobile-menu a')).toHaveText(['爱的首页', '爱的故事', '爱的相册'])
  await page.locator('.mobile-menu').getByRole('link', { name: '爱的相册' }).click()
  await expect(page.locator('#album')).toBeInViewport()
})

test('backend allowlist enables journey navigation but never admin access', async ({ page, app }) => {
  app.allowedPages = ['/index', '/journey']
  await page.goto('/index')
  await page.locator('.nav-links').getByRole('link', { name: '爱的旅程' }).click()
  await expect(page).toHaveURL(/\/journey$/)
  await expect(page.locator('.map-container')).toBeVisible()
  await expect(page.locator('.nav-account-actions').getByRole('link', { name: '管理', exact: true })).toHaveCount(0)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/index$/)
})

test('unknown future routes are denied even if their metadata says public', async ({ page, app }) => {
  await page.goto('/index')
  await page.evaluate(async () => {
    const router = (await import('/src/router/index.js')).default
    router.addRoute({ path: '/future', component: { template: '<p>future secret</p>' }, meta: { public: true } })
    await router.push('/future')
  })
  await expect(page).toHaveURL(/\/index$/)
  await expect(page.getByText('future secret')).toHaveCount(0)
})
