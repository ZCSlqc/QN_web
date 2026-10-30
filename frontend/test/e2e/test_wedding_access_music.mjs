import {test,expect} from '../fixtures/app.mjs';

test('ordinary wedding visitors cannot open calibration or rip routes',async({page,app})=>{
 app.allowedPages=['/index','/wedding'];const calibration=[];page.on('request',request=>{if(request.url().includes('/src/views/WeddingRigView.vue'))calibration.push(request.url());});
 await page.goto('/wedding/rig');await expect(page).toHaveURL(/\/index$/);await expect(page.locator('.review-page')).toHaveCount(0);expect(calibration).toEqual([]);
 await page.goto('/rip');await expect(page).toHaveURL(/\/index$/);
 await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
});

test('wedding music stays in the lower right, loads on demand and continues across pages',async({page,app})=>{
 app.allowedPages=['/index','/wedding'];const requests=[];page.on('request',request=>{if(request.url().includes('/shared/audio/'))requests.push(request.url());});
 await page.setViewportSize({width:390,height:844});await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
 const button=page.getByRole('button',{name:'播放音乐',exact:true}),audio=page.locator('audio');await expect(button).toBeVisible();await expect(audio).toHaveAttribute('preload','none');await expect(audio).toHaveAttribute('src','/shared/audio/city-of-stars.mp3');expect(requests).toEqual([]);
 const box=await button.boundingBox(),toolbar=await page.locator('.wedding-toolbar').boundingBox();expect(box.x).toBeGreaterThan(300);expect(box.y+box.height).toBeLessThan(toolbar.y);
 await button.click();await expect.poll(()=>audio.evaluate(el=>el.currentTime)).toBeGreaterThan(0);await audio.evaluate(el=>{window.__weddingAudio=el;el.currentTime=10;});
 await page.getByRole('link',{name:'← 返回',exact:true}).click();await expect(page).toHaveURL(/\/index$/);expect(await audio.evaluate(el=>el===window.__weddingAudio&&!el.paused&&el.currentTime>=10)).toBe(true);await page.getByRole('button',{name:'暂停音乐',exact:true}).click();
});
