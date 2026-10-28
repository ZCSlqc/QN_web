import { test, expect } from '../fixtures/app.mjs'

test('sending a letter automatically closes the mailbox before its reward', async ({ page, app }) => {
  app.admin = true; app.mailbox = true
  await page.goto('/index')
  await page.locator('.mailbox-trigger').click()
  await page.getByRole('button', { name: '写封信', exact: true }).click()
  await page.locator('#mail-title').fill('今晚一起吃饭')
  await page.locator('#mail-body').fill('想你啦。')
  await page.getByRole('button', { name: '寄给ta', exact: true }).click()
  await expect(page.locator('.mailbox-panel')).toBeHidden()
  await expect(page.locator('.message-flight-icon')).toHaveAttribute('src', '/feedback/letter-sent.png')
  await expect(page.locator('.mailbox-trigger')).toHaveClass(/pet-reward-arrived/)
  await expect(page.locator('.food-reward-flight strong')).toHaveText('+1')
})

test('receipts aggregate while a dialog is open, then fly after it closes', async ({ page, app }) => {
  app.admin = true
  await page.goto('/cat')
  await expect(page.locator('.pet-nav-link')).toBeVisible()
  await page.evaluate(async () => {
    const dialog = document.createElement('div'); dialog.id = 'reward-test-dialog'; dialog.setAttribute('role', 'dialog'); dialog.style.cssText = 'position:fixed;width:100px;height:100px;top:100px'; document.body.append(dialog)
    const { announceFoodReward } = await import('/src/features/pet/rewardFeedback.js')
    announceFoodReward({ data: { food_reward: { food: 'treat', amount: 1 } } })
    announceFoodReward({ data: { food_reward: { food: 'treat', amount: 2 } } })
    announceFoodReward({ data: { food_reward: { food: 'can', amount: 0 } } })
    announceFoodReward({ data: { replayed: true, treat_reward: 1, reward_status: 'confirmed' } })
  })
  await page.waitForTimeout(600)
  await expect(page.locator('.food-reward-flight')).toHaveCount(0)
  await page.evaluate(() => document.querySelector('#reward-test-dialog').remove())
  await expect(page.locator('.food-reward-flight strong')).toHaveText('+3')
  await expect(page.locator('.food-reward-flight img')).toHaveAttribute('src', '/pet/icons/cat-treat.png')
  await expect(page.locator('.pet-nav-link')).toHaveClass(/pet-reward-arrived/)
  await expect(page.locator('.food-reward-flight')).toHaveCount(0)
})

test('mobile rewards target the menu and reduced motion shows an arrival notice', async ({ page, app }) => {
  app.admin = true
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/cat')
  await page.evaluate(async () => {
    const { announceFoodReward } = await import('/src/features/pet/rewardFeedback.js')
    announceFoodReward({ data: { food_reward: { food: 'can', amount: 1 } } })
  })
  await expect(page.locator('.food-reward-flight')).toHaveClass(/reward-reduced/)
  await expect(page.locator('.food-reward-flight')).toContainText('已放入小窝')
  await expect(page.locator('.nav-toggle')).toHaveClass(/pet-reward-arrived/)
})
