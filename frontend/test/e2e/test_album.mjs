import { test, expect } from '../fixtures/app.mjs'
import { fileURLToPath } from 'node:url'

test('all original photos can be removed in edit mode, and a portrait fills the lead slot', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.locator('.album-grid').scrollIntoViewIfNeeded()
  await expect(page.locator('.album-photo.grid-tall img')).toHaveAttribute('src', '/api/photos/1/thumbnail')
  await page.locator('.album-actions').getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('.editable-photo')).toHaveCount(14)
  await page.getByRole('button', { name: '删除照片 1', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.locator('.editable-photo')).toHaveCount(13)
  await page.getByRole('button', { name: '删除照片 14', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.locator('.editable-photo')).toHaveCount(12)
  await page.locator('.album-actions').getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.album-photo.grid-tall img')).toHaveAttribute('src', '/api/photos/5/thumbnail')
  await page.reload()
  await expect(page.locator('.album-photo.grid-tall img')).toHaveAttribute('src', '/api/photos/5/thumbnail')
  await expect(page.locator('.photo-delete')).toHaveCount(0)
  expect(app.deleted).toEqual([1, 14])
  await page.locator('.album-photo').first().click()
  await expect(page.locator('.el-image-viewer__img')).toBeVisible()
})

test('visitors can browse a small or empty album without management controls', async ({ page, app }) => {
  app.photos = app.photos.slice(1, 3)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index')
  await expect(page.locator('.album-photo')).toHaveCount(2)
  await expect(page.locator('.album-photo.grid-tall')).toHaveClass(/keep-whole/)
  await expect(page.locator('.album-actions')).toHaveCount(0)
  await expect(page.locator('.album-corner')).toHaveCount(0)
  app.photos = []
  await page.reload()
  await expect(page.getByText('相册还是空的，下一张回忆等你放进来。')).toBeVisible()
})

test('failed deletion retains the photo and cancelled deletion sends no request', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.locator('.album-actions').getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByRole('button', { name: '删除照片 1', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  expect(app.deleted).toEqual([])
  app.fail.add('/photos/1')
  await page.getByRole('button', { name: '删除照片 1', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByText('删除失败，请稍后重试', { exact: true })).toBeVisible()
  await expect(page.locator('.editable-photo')).toHaveCount(14)
})

test('upload and original photos use the same editable album', async ({ page, app }) => {
  app.admin = true
  await page.goto('/index')
  await page.locator('.album-actions').getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByRole('button', { name: '＋ 上传照片', exact: true }).click()
  const { readFileSync } = await import('node:fs')
  const bytes = [...readFileSync(fileURLToPath(new URL('../fixtures/images/photo-one.webp', import.meta.url)))]
  const transfer = await page.evaluateHandle(bytes => {
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array(bytes)], 'memory.webp', { type: 'image/webp' }))
    return data
  }, bytes)
  await page.locator('.upload-dialog').dispatchEvent('dragover', { dataTransfer: transfer })
  await expect(page.locator('.upload-dialog')).toHaveClass(/dragging/)
  await page.locator('.upload-dialog').dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await page.locator('#photo-caption').fill('新的回忆')
  await page.getByRole('button', { name: '上传 1 张', exact: true }).click()
  await expect(page.locator('.upload-summary')).toContainText('已上传 1 张')
  await page.locator('.upload-dialog').getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.editable-photo')).toHaveCount(15)
  await expect(page.locator('.editable-photo').first()).toContainText('新的回忆')
})

test('corner photos crossfade above an opaque outgoing photo', async ({ page, app }) => {
  await page.goto('/index')
  await page.locator('.album-corner').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => {
    const image = document.querySelector('.corner-slot .is-incoming')
    if (!image) return false
    const opacity = Number(getComputedStyle(image).opacity)
    return opacity > 0.1 && opacity < 0.9
  })
  expect(await page.locator('.corner-slot:has(.is-incoming)').evaluate(el => getComputedStyle(el.querySelector('.is-front')).opacity)).toBe('1')
  await expect(page.locator('.corner-slot .is-incoming')).toHaveCount(0)
  await page.locator('.album-corner').hover()
  const photos = await page.locator('.corner-slot .is-front').evaluateAll(images => images.map(image => image.src))
  await page.waitForTimeout(3500)
  expect(await page.locator('.corner-slot .is-front').evaluateAll(images => images.map(image => image.src))).toEqual(photos)
})

test('each rounded corner tile previews its own original photo', async ({ page, app }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index')
  const slots = page.locator('button.corner-slot')
  await expect(slots).toHaveCount(4)
  for (let index = 0; index < 4; index++) {
    const slot = slots.nth(index)
    const thumbnail = await slot.locator('.is-front').getAttribute('src')
    expect(await slot.evaluate(el => getComputedStyle(el).borderRadius)).toBe('10px')
    await slot.click()
    await expect(page.locator('.el-image-viewer__img').filter({ visible: true })).toHaveAttribute('src', thumbnail.replace('/thumbnail', '/image'))
    await page.keyboard.press('Escape')
    await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  }
  await slots.nth(2).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.el-image-viewer__img').filter({ visible: true })).toHaveAttribute('src', '/api/photos/10/image')
})

test('a click during crossfade previews the visually dominant photo', async ({ page, app }) => {
  await page.goto('/index')
  await page.locator('.album-corner').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => {
    const image = document.querySelector('.corner-slot .is-incoming')
    return image && Number(getComputedStyle(image).opacity) > 0.6 && Number(getComputedStyle(image).opacity) < 0.95
  })
  const expected = await page.locator('.corner-slot:has(.is-incoming)').evaluate(slot => {
    const incoming = slot.querySelector('.is-incoming')
    const image = Number(getComputedStyle(incoming).opacity) >= 0.5 ? incoming : slot.querySelector('.is-front')
    const url = image.getAttribute('src').replace('/thumbnail', '/image')
    slot.click()
    return url
  })
  await expect(page.locator('.el-image-viewer__img').filter({ visible: true })).toHaveAttribute('src', expected)
})
