import { test, expect } from '../fixtures/app.mjs'

test('pet is the only pet route and old cat access is not translated', async ({page,app})=>{
  app.allowedPages=['/index','/pet']
  await page.goto('/pet')
  await expect(page.locator('.pet-room')).toBeVisible()
  await expect(page.locator('a.pet-nav-link')).toHaveAttribute('href','/pet')
  await page.goto('/cat?from=bookmark')
  await expect(page).toHaveURL(/\/index(?:\?|$)/)
  await expect(page.locator('.pet-room')).toHaveCount(0)
  app.allowedPages=['/index','/cat']
  await page.goto('/pet')
  await expect(page).toHaveURL(/\/index$/)
  await expect(page.locator('.pet-room')).toHaveCount(0)
})

test('pet requires explicit access', async ({page,app})=>{
  app.allowedPages=['/index']
  for(const path of ['/pet','/cat']){
    await page.goto(path)
    await expect(page).toHaveURL(/\/index$/)
    await expect(page.locator('.pet-room')).toHaveCount(0)
    await expect(page.locator('a.pet-nav-link')).toHaveCount(0)
  }
})
