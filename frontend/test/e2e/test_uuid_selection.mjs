import { test, expect } from '../fixtures/app.mjs'

test('journey and plan selectors treat UUIDs as strings', async ({ page, app }) => {
  app.admin = true
  const one = '2ae22fa7-6284-4ad2-8e32-3443c65ce711'
  const two = '4f57b923-92c3-46b0-bf9c-a8e28549e732'
  const base = app.journeys[0]
  app.journeys = [{ ...base, id: one, notes: '第一次旅程' }, { ...base, id: two, notes: '第二次旅程' }]
  app.plans = [{ id: one, name: ['上海市'], adcodes: ['310000'], reason: '第一个计划' }, { id: two, name: ['上海市'], adcodes: ['310000'], reason: '第二个计划' }]
  await page.goto('/journey')
  await page.locator('.journey-record').first().getByRole('button', { name: '编辑', exact: true }).click()
  await page.locator('#journey-visit').selectOption(two)
  await expect(page.locator('#notes')).toHaveValue('第二次旅程')
  await page.getByRole('button', { name: '预定旅程', exact: true }).click()
  await page.locator('#journey-plan').selectOption(two)
  await expect(page.locator('#plan-reason')).toHaveValue('第二个计划')
})
