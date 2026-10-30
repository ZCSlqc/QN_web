import { test, expect } from '../fixtures/app.mjs'

function incoming(id = 1) {
  return { id, sender_name: '测试乙', recipient_name: '测试甲', body: `想和你说的话 ${id}\n<script>这只是文字</script>`, kind: 'secret', created_at: '2026-10-28 08:00:00', recipient_read_at: null, comments: [] }
}

test('visitors and unrelated administrators do not see the mailbox', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await expect(page.getByRole('link', { name: '管理', exact: true })).toBeVisible()
  await expect(page.locator('.mailbox-trigger')).toHaveCount(0)
})

test('only opening a letter clears unread count; replies and mobile detail work', async ({ page, app }, testInfo) => {
  app.mailbox = true
  app.mailboxLetters = [incoming(), incoming(2)]
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index')
  await expect(page.locator('.mailbox-badge')).toHaveText('2')
  await page.locator('.mailbox-trigger').click()
  await expect(page.locator('.letter-item')).toHaveCount(2)
  expect(app.mailboxLetters.every(letter => letter.recipient_read_at === null)).toBe(true)
  await page.locator('.letter-item').first().click()
  await expect(page.locator('.letter-paper')).toContainText('想和你说的话 2')
  await expect(page.locator('.mailbox-badge')).toHaveText('1')
  expect(app.mailboxLetters[0].recipient_read_at).toBeNull()
  await expect(page.locator('.letter-body')).toContainText('<script>这只是文字</script>')
  await expect(page.locator('.letter-body script')).toHaveCount(0)
  await page.locator('#mail-comment').fill('我也想你，我们明天一起散步吧。')
  await page.getByRole('button', { name: '留下回应', exact: true }).click()
  await expect(page.locator('.mail-comment')).toContainText('我也想你')
  await page.getByRole('button', { name: '下一封', exact: true }).click()
  await expect(page.locator('.letter-paper')).toContainText('想和你说的话 1')
  await expect(page.locator('.mailbox-badge')).toHaveCount(0)
  await page.setViewportSize({ width: 320, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mailbox-mobile.png') })
})

test('sending retries keep the draft and do not duplicate delivery', async ({ page, app }, testInfo) => {
  app.mailbox = true
  app.mailboxFailAfterSendOnce = true
  await page.goto('/index')
  await page.locator('.mailbox-trigger').click()
  await page.getByRole('button', { name: '写封信', exact: true }).click()
  await page.locator('#mail-kind').selectOption('apology')
  await expect(page.locator('#mail-title')).toHaveCount(0)
  await page.locator('#mail-body').fill('对不起，刚才有点着急。\n我想听听你的想法。')
  await page.getByRole('button', { name: '寄给ta', exact: true }).click()
  await expect(page.locator('.letter-compose .mailbox-error')).toBeVisible()
  await expect(page.locator('#mail-body')).toHaveValue('对不起，刚才有点着急。\n我想听听你的想法。')
  await page.getByRole('button', { name: '寄给ta', exact: true }).click()
  await expect(page.locator('.mailbox-panel')).toBeHidden()
  await page.locator('.mailbox-trigger').click()
  await page.locator('.letter-item').first().click()
  await expect(page.locator('.letter-paper')).toContainText('对不起，刚才有点着急。')
  await expect(page.locator('.letter-receipt')).toContainText('对方还没有打开')
  expect(app.mailboxLetters).toHaveLength(1)
  expect(app.mailboxLetters[0].recipient_read_at).toBeNull()
  await page.screenshot({ path: testInfo.outputPath('mailbox-desktop.png') })
})

test('new comment notification is separate from unread letters and drafts are protected', async ({ page, app }) => {
  app.mailbox = true
  const letter = incoming()
  letter.recipient_read_at = '2026-10-28 08:00:00'
  letter.comments = [{ id: 1, author: '测试乙', content: '还有一句，记得吃早饭。', created_at: '2026-10-28 08:01:00' }]
  app.mailboxLetters = [letter]
  await page.goto('/index')
  await expect(page.locator('.mailbox-dot')).toBeVisible()
  await expect(page.locator('.mailbox-badge')).toHaveCount(0)
  await page.locator('.mailbox-trigger').click()
  await expect(page.locator('.letter-badge.reply')).toContainText('新留言 1')
  await page.locator('.letter-item').click()
  await expect(page.locator('.mail-comment')).toContainText('记得吃早饭')
  await expect(page.locator('.mailbox-dot')).toHaveCount(0)
  await page.locator('#mail-comment').fill('这段话还没写完')
  await page.getByRole('button', { name: '关闭信箱', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '继续写', exact: true }).click()
  await expect(page.locator('#mail-comment')).toHaveValue('这段话还没写完')
})
