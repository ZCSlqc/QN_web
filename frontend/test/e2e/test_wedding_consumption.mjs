import { test, expect } from '../fixtures/app.mjs';

test('food expires after thirty visible seconds and flowers do not expire', async ({ page, app }) => {
  test.setTimeout(120000);
  app.allowedPages=['/wedding'];
  await page.goto('/wedding');
  await expect(page.locator('canvas[data-renderer="2d"]')).toBeVisible();
  const menu=page.getByRole('navigation',{name:'婚礼招待'}),dialog=page.locator('dialog');
  await menu.getByRole('button',{name:'新鲜水果'}).click();
  await dialog.getByRole('button',{name:'领取苹果',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.clock.install();
  await expect(page.locator('.consume-time')).toContainText('30 秒后吃完');
  await page.clock.fastForward(29000);
  await expect(page.locator('.collected')).toContainText('苹果');
  await page.clock.fastForward(1250);
  await expect(page.locator('.collected')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute('data-held-item','');
  await expect(page.locator('.wedding-toolbar')).toContainText('苹果吃完啦');
  await page.clock.resume();
  await menu.getByRole('button',{name:'花礼管家'}).click();
  await dialog.getByRole('button',{name:'领取红玫瑰',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.clock.fastForward(31000);
  await expect(page.locator('.collected')).toContainText('红玫瑰');
  await expect(page.locator('.consume-time')).toHaveCount(0);
});
