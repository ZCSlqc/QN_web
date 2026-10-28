import { test, expect } from '../fixtures/app.mjs'

test('story grows with its contents and retains edits after reload', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await expect(page.locator('.story-content')).toContainText(app.story.content)
  const initialHeight = (await page.locator('.love-story').boundingBox()).height
  await page.getByRole('button', { name: '编辑故事' }).click()
  const content = Array.from({ length: 18 }, (_, i) => `第${i + 1}行：我们的小故事。`).join('\n')
  await page.locator('#story-content').fill(content)
  await page.locator('.story-save').click()
  await expect(page.locator('.story-content')).toHaveText(content)
  expect((await page.locator('.love-story').boundingBox()).height).toBeGreaterThan(initialHeight + 200)
  await page.reload()
  await expect(page.locator('.story-content')).toHaveText(content)
})
