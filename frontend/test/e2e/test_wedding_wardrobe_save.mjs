import {test,expect} from '../fixtures/app.mjs';

for(const [username,persona,hair] of [['shenqidayang','calm-girl','blackwoman3'],['lqc','lively-boy','blackman2']])test(`${username} gets the requested appearance and temperament`,async({page,app})=>{
 app.profileUsername=username;app.allowedPages=['/index','/wedding'];await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-player-persona',persona);await expect(canvas).toHaveAttribute('data-appearance',new RegExp(hair));expect(app.wardrobeReads).toBe(1);
});

test('hair and headwear can be removed, outfits enter the user library and dressing survives reload',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toBeVisible();await page.getByRole('button',{name:'我的造型',exact:true}).click();const w=page.locator('.wardrobe');
 await w.getByRole('button',{name:'没有头发',exact:true}).click();await w.getByRole('button',{name:'头饰',exact:true}).click();await w.getByRole('button',{name:'没有头饰',exact:true}).click();
 await expect(w.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/"hair":"none"/);await expect(w.locator('.wardrobe-summary .character-preview')).toHaveAttribute('aria-busy','false');
 await w.getByRole('button',{name:'造型',exact:true}).click();await w.getByRole('button',{name:'套装',exact:true}).click();await w.getByLabel('搭配名称',{exact:true}).fill('晴天搭配');await w.getByRole('button',{name:'保存当前搭配',exact:true}).click();
 await expect.poll(()=>app.weddingWardrobe.outfits.length).toBe(1);expect(app.weddingWardrobe.outfits[0].appearance.hair).toBeUndefined();await expect(w.getByRole('button',{name:'晴天搭配',exact:true})).toBeVisible();
 await w.getByRole('button',{name:'穿好啦',exact:true}).click();await expect(w).toHaveCount(0);expect(app.wardrobeWrites).toBe(1);expect(app.weddingWardrobe.appearance.hair).toBe('none');
 await page.getByRole('button',{name:'我的造型',exact:true}).click();await w.getByRole('button',{name:'穿好啦',exact:true}).click();await expect(w).toHaveCount(0);expect(app.wardrobeWrites).toBe(1);expect(app.wardrobeReads).toBe(1);
 await page.reload();await expect(canvas).toHaveAttribute('data-appearance',/"hair":"none"/);await expect(canvas).toHaveAttribute('data-appearance',/"headwear":"none"/);expect(app.wardrobeReads).toBe(2);
 await page.getByRole('button',{name:'我的造型',exact:true}).click();await w.getByRole('button',{name:'造型',exact:true}).click();await w.getByRole('button',{name:'套装',exact:true}).click();await w.getByRole('button',{name:'我的搭配 1',exact:true}).click();await w.getByRole('button',{name:'晴天搭配',exact:true}).click();await w.getByRole('button',{name:'移除这套收藏',exact:true}).click();await expect.poll(()=>app.weddingWardrobe.outfits.length).toBe(0);
});

test('clothing previews load only front clothing and reuse decoded assets across instances',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();const requests=[];page.on('request',r=>{if(r.url().includes('/wedding/kenney_modular-characters/'))requests.push(r.url());});
 const result=await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js');const first=await loadCharacters(),second=await loadCharacters(),value={...makeAppearance(),formalStyle:'jacket',formalColor:'olive'};
  await first.ensureClothesAppearance(value);const afterFirst=performance.getEntriesByType('resource').length;first.dispose();const a=await second.ensureClothesAppearance(value),afterSecond=performance.getEntriesByType('resource').length;const canvas=document.createElement('canvas');canvas.width=500;canvas.height=600;const c=canvas.getContext('2d');c.translate(250,500);const drawn=second.drawClothes(c,a,'sets');second.dispose();return {afterFirst,afterSecond,drawn};
 });expect(result.drawn).toBe(true);expect(result.afterSecond).toBe(result.afterFirst);expect(requests.some(url=>url.includes('jacket-olive'))).toBe(true);expect(requests.filter(url=>/\/(Skin|Hair|Face)\//.test(url)||url.includes('-back.svg'))).toEqual([]);
});
