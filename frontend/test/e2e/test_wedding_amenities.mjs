import {test,expect} from '../fixtures/app.mjs';

test('four food styles and two gift styles have six original items each, and QR stays native',async({page,app},testInfo)=>{
 test.setTimeout(120000);app.allowedPages=['/wedding'];
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/wedding');
 const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-motion-rig','original-svg-segments');
 const menu=page.getByRole('navigation',{name:'婚礼招待'}),dialog=page.locator('dialog');
 for(const [station,tabs,pick] of [
  ['饮料与小食',['清爽饮料','活力小食'],'汉堡'],
  ['中餐与甜品',['家宴中餐','奶油甜品'],'草莓冰淇淋'],
  ['礼物与鲜花',['奶油花园','喜庆红金'],'红色金带礼盒'],
 ]){
  await menu.getByRole('button',{name:station}).click();await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:/^领取/})).toHaveCount(12);
  for(const tab of tabs){await dialog.getByRole('button',{name:tab+' 6',exact:true}).click();await expect(dialog.getByRole('button',{name:/^领取/})).toHaveCount(6);}
  await dialog.getByRole('button',{name:'领取'+pick,exact:true}).click();await expect(page.locator('.collected')).toContainText(pick);
  await dialog.locator('.item-grid img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await page.screenshot({path:testInfo.outputPath(station+'.png')});await page.keyboard.press('Escape');
 }
 await page.getByRole('button',{name:'收起领取物品'}).click();await expect(page.locator('.collected')).toHaveCount(0);
 await menu.getByRole('button',{name:'随个份子'}).click();await expect(dialog.locator('.payment-code')).toHaveJSProperty('naturalWidth',1118);
 await expect(dialog.getByRole('link',{name:'保存收款码原图'})).toHaveAttribute('download','婚礼微信收款码.jpg');
 await page.setViewportSize({width:390,height:844});await expect(dialog).toBeInViewport();await page.screenshot({path:testInfo.outputPath('mobile-payment.png')});
});
