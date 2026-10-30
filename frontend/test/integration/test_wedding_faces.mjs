import {test,expect} from '@playwright/test';

test('real backend persists default faces and the built wedding consumes them without extra writes',async({page})=>{
 await page.goto('/login');await page.getByRole('textbox',{name:'名字'}).fill('集成测试甲');await page.getByRole('textbox',{name:'密码',exact:true}).fill('integration-password');await page.getByRole('button',{name:'登 录'}).click();await expect(page).toHaveURL(/\/index$/);
 if(await page.evaluate(()=>localStorage.getItem('need_blessing')==='1'))await page.getByRole('button',{name:'稍后再说'}).click();
 const token=await page.evaluate(()=>localStorage.getItem('token')),headers={Authorization:`Bearer ${token}`};const first=await page.request.get('/api/wedding/people',{headers});expect(first.ok()).toBe(true);const roster=await first.json();expect(Object.keys(roster.npcFaces).sort()).toEqual(['florist','juggler']);
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-people',/face-completes-face/);const actors=JSON.parse(await canvas.getAttribute('data-people'));
 for(const kind of ['florist','juggler'])expect(actors.find(a=>a.kind===kind).face).toBe(roster.npcFaces[kind]);
 for(const person of roster.people)if(person.role!=='groom'&&!person.appearance)expect(actors.find(a=>a.username===person.username).face).toBe(person.facePreset);
 const unchanged=await page.request.get('/api/wedding/people',{headers:{...headers,'If-None-Match':first.headers().etag}});expect(unchanged.status()).toBe(304);
 expect((await (await page.request.get('/api/wedding/people',{headers})).json())).toEqual(roster);
});
