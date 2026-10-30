import { test, expect } from '../fixtures/app.mjs';

test('painted emoji backs are selected correctly and remain attached at the neck', async ({page,app},testInfo)=>{
  test.setTimeout(60000);
  app.admin=true;
  await page.goto('/wedding');
  await expect(page.locator('.wedding-canvas canvas')).toBeVisible({timeout:20000});
  const result=await page.evaluate(async()=>{
    const {loadCharacters}=await import('/src/features/wedding/characters.js');
    const {makeAppearance,emojiHeads,resolveParts}=await import('/src/features/wedding/catalog.js');
    const ids=['smile','party','little-devil','invisible','freezing','mind-blown','secret'];
    const art=await loadCharacters();
    const sheet=document.createElement('canvas');sheet.width=1120;sheet.height=300;sheet.id='emoji-backs-proof';
    sheet.style.cssText='position:fixed;inset:0;z-index:99999;background:#e3e8df;width:1120px;height:300px';document.body.append(sheet);
    const ctx=sheet.getContext('2d'),draw=ctx.drawImage.bind(ctx),bottoms=[],textures=[];
    ctx.drawImage=(...args)=>{
      if(args[0]?.src?.includes('-back.webp'))bottoms.push(args[6]+args[8]);
      draw(...args);
    };
    for(let i=0;i<ids.length;i++){
      const appearance=await art.ensureAppearance({...makeAppearance(),animalHead:`emoji-${ids[i]}`});
      textures.push(resolveParts(appearance).animalBack.file);
      for(let j=0;j<2;j++)art.draw(ctx,{x:40+i*160+j*76,y:230,appearance,direction:j?'back':'front'},0,true);
      ctx.font='12px sans-serif';ctx.fillStyle='#493c31';ctx.fillText(ids[i],i*160+20,270);
    }
    const ordinary=emojiHeads.filter(h=>!ids.slice(1).some(id=>h.id===`emoji-${id}`));
    const ordinaryFiles=ordinary.map(h=>resolveParts({...makeAppearance(),animalHead:h.id}).animalBack.file);
    art.dispose();return {textures,bottoms,ordinaryFiles};
  });
  expect(result.textures).toEqual(['yellow-back.webp','party-back.webp','little-devil-back.webp','invisible-back.webp','freezing-back.webp','mind-blown-back.webp','secret-back.webp']);
  expect(new Set(result.ordinaryFiles)).toEqual(new Set(['yellow-back.webp']));
  expect(result.bottoms).toHaveLength(7);
  // Eight transparent pixels sit below the common neck anchor on a 256px frame.
  for(const y of result.bottoms)expect(y).toBeCloseTo(-355 + 8 * 180 / 224,5);
  await page.locator('#emoji-backs-proof').screenshot({path:testInfo.outputPath('emoji-front-back.png')});
});

test('failed painted back does not apply a half-loaded avatar and can be retried',async({page,app})=>{
  app.admin=true;
  await page.goto('/wedding');
  const canvas=page.locator('.wedding-canvas canvas');
  await expect(canvas).toBeVisible({timeout:20000});
  const original=await canvas.getAttribute('data-appearance');
  await page.route('**/wedding/emoji/party-back.webp',route=>route.abort());
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.locator('.wardrobe').getByRole('button',{name:'emoji',exact:true}).click();
  await page.getByRole('button',{name:'派对主角',exact:true}).click();
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(page.locator('.wardrobe footer [role=alert]')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-appearance',original);
  await page.unroute('**/wedding/emoji/party-back.webp');
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-appearance',/emoji-party/);
});
