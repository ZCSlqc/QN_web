import { test, expect } from '../fixtures/app.mjs'

test('journey shares the navigation with a permanent translucent white background', async ({ page, app }) => {
  app.admin = true
  await page.goto('/journey')
  await expect(page.locator('.nav-bar')).toHaveClass(/scrolled/)
  await expect(page.locator('.nav-bar')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.88)')
  await expect(page.locator('.nav-account-actions').getByRole('link', { name: '管理', exact: true })).toBeVisible()
  await page.locator('.nav-links').getByRole('link', { name: '爱的故事' }).click()
  await expect(page).toHaveURL(/\/index#story$/)
  await expect.poll(() => page.locator('#story').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 180)).toBe(true)
  await page.locator('.nav-links').getByRole('link', { name: '爱的旅程' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '切换导航菜单' }).click()
  await expect(page.locator('.mobile-menu')).toBeVisible()
  await page.locator('.mobile-menu').getByRole('link', { name: '爱的相册' }).click()
  await expect(page).toHaveURL(/\/index#album$/)
  await expect(page.locator('.mobile-menu')).toHaveCount(0)
})

test('navigation uses the verified identity before page requests finish and keeps management next to account', async ({ page, app }) => {
  app.admin = true; app.mailbox = true
  let calls = 0
  await page.route('**/api/me', async route => {
    calls++
    if (calls > 1) return route.abort()
    return route.fallback()
  })
  await page.goto('/index')
  const actions = page.locator('.nav-account-actions')
  await expect(actions.getByRole('button', { name: '账号', exact: true })).toBeVisible()
  await expect(actions.getByRole('link', { name: '管理', exact: true })).toBeVisible()
  const account = await actions.getByRole('button', { name: '账号', exact: true }).boundingBox()
  const management = await actions.getByRole('link', { name: '管理', exact: true }).boundingBox()
  expect(management.x).toBeGreaterThan(account.x + account.width)
  await expect(page.locator('.nav-links').getByRole('link', { name: '管理', exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 320, height: 844 })
  await expect(actions.getByRole('link', { name: '管理', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '切换导航菜单' }).click()
  await expect(page.locator('.mobile-menu').getByRole('link', { name: /管理/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
