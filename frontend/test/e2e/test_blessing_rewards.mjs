import { test, expect } from '../fixtures/app.mjs'

test('daily first blessing earns a personal treat usable by an ordinary user', async ({ page, app }) => {
  app.allowedPages = ['/index', '/pet']
  await page.goto('/index')
  async function leaveBlessing(text) {
    await page.getByRole('button', { name: '💌 送上祝福' }).click()
    await page.getByRole('textbox', { name: '祝福内容' }).fill(text)
    await page.getByRole('button', { name: '送出祝福', exact: true }).click()
  }
  await leaveBlessing('祝你们每天开心')
  await expect(page.getByText('祝福送到啦，猫条已放进你的口袋。', { exact: true })).toBeVisible()
  expect(app.personalTreats).toBe(1)
  await expect(page.locator('.message-flight-icon')).toHaveAttribute('src', '/shared/feedback/blessing-sent.png')
  await expect(page.locator('.nav-logo')).toHaveClass(/pet-reward-arrived/)
  await expect(page.locator('.food-reward-flight strong')).toHaveText('+1')
  await expect(page.locator('.food-reward-flight')).toHaveCount(0)
  await leaveBlessing('再留一句祝福')
  expect(app.personalTreats).toBe(1)
  await page.locator('.nav-links').getByRole('link', { name: '爱的小窝' }).click()
  await expect(page.locator('.nav-bar')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.88)')
  await expect(page.locator('.pantry-card .treat .food-count')).toContainText('1根')
  await page.reload()
  await page.getByRole('button', { name: '投喂猫条', exact: true }).click()
  await expect(page.locator('.pantry-card .treat .food-count')).toContainText('0根')
  await expect(page.locator('.diary-list')).toContainText('把留言攒下的猫条喂给了六一')
  expect(app.petInventory).toEqual({ treat: 5, kibble: 3, can: 2 })
  await expect(page.locator('.pantry-card')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '投喂猫条', exact: true })).toBeDisabled()
})
