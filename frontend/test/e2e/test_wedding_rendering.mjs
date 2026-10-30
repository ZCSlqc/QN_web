import {test,expect} from '../fixtures/app.mjs';

test('background stays cached during animation and follows resizing, panning and disposal',async({page,app})=>{
 app.admin=true;
 await page.addInitScript(()=>{
  window.__backgroundDraws=0;
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   if(image?.src?.includes('/background/garden-orthographic.webp'))window.__backgroundDraws++;
   return draw.call(this,image,...args);
  };
 });
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas'),backdrop=page.locator('.wedding-backdrop');
 await expect(canvas).toHaveAttribute('data-juggling',/gold-ingot/);
 await expect(backdrop).toHaveCount(1);const count=await page.evaluate(()=>window.__backgroundDraws);
 const initial=await backdrop.evaluate(el=>el.toDataURL());
 await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('button',{name:'🐇 开心小跳',exact:false}).click();
 await expect.poll(async()=>Number(await canvas.getAttribute('data-jump-height'))).toBeGreaterThan(30);
 await page.waitForTimeout(300);
 expect(await page.evaluate(()=>window.__backgroundDraws)).toBe(count);
 expect(await backdrop.evaluate(el=>el.toDataURL())).toBe(initial);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>window.__backgroundDraws)).toBeGreaterThan(count);
 const resized=await page.evaluate(()=>window.__backgroundDraws),before=await canvas.getAttribute('data-pan');
 await page.mouse.move(310,510);await page.mouse.down();await page.mouse.move(90,510,{steps:6});await page.mouse.up();
 await expect(canvas).not.toHaveAttribute('data-pan',before);
 await expect.poll(()=>page.evaluate(()=>window.__backgroundDraws)).toBeGreaterThan(resized);
 await page.getByRole('link',{name:'← 返回',exact:true}).click();
 await expect(backdrop).toHaveCount(0);await expect(canvas).toHaveCount(0);
});

test('seated cats render before sequential action downloads and an optional atlas failure preserves the scene',async({page,app})=>{
 app.admin=true;const actions=[];let release;
 const gate=new Promise(resolve=>{release=resolve});
 await page.route('**/wedding/cats/*-actions.webp',async route=>{
  actions.push(route.request().url());
  if(actions.length===1)await gate;
  if(route.request().url().includes('/anan-actions'))await route.abort();else await route.continue();
 });
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');
 await expect(canvas).toHaveAttribute('data-cats',/liuyi/);
 await expect.poll(()=>actions.length).toBe(1);
 await page.waitForTimeout(200);expect(actions).toHaveLength(1);
 const cats=JSON.parse(await canvas.getAttribute('data-cats'));expect(cats.every(c=>c.state==='sit'||c.state==='observe')).toBe(true);
 release();await expect.poll(()=>actions.length).toBe(5);
 await expect(page.locator('.wedding-error')).toHaveCount(0);
 await page.getByRole('button',{name:'摸摸安安'}).focus();await page.keyboard.press('Enter');
 await expect.poll(async()=>JSON.parse(await canvas.getAttribute('data-cats')).find(c=>c.id==='anan').reacting).toBe(true);
});

test('mobile downloads visible cat animations and compact props, while payment original waits for opening',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:390,height:844});const actions=[],images=[];
 page.on('request',request=>{const url=request.url();if(url.includes('-actions.webp'))actions.push(url);if(request.resourceType()==='image')images.push(url);});
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-cats',/liuyi/);
 const expected=await canvas.evaluate(el=>{const scale=Number(el.dataset.characterScale);return JSON.parse(el.dataset.cats).filter(c=>c.x+44*scale>0&&c.x-44*scale<390).map(c=>c.id);});
 await expect.poll(()=>actions.length).toBe(expected.length);expect(expected.length).toBeLessThan(5);
 expect(actions.map(url=>url.match(/\/([^/]+)-actions.webp/)[1]).sort()).toEqual(expected.sort());
 expect(images.filter(url=>url.includes('/original/')).length).toBeLessThan(16);
 expect(images.some(url=>url.includes('wechat-preview.webp'))).toBe(true);expect(images.some(url=>url.includes('wechat-receive.jpg'))).toBe(false);
 const before=actions.length;await page.mouse.move(300,510);await page.mouse.down();await page.mouse.move(80,510,{steps:8});await page.mouse.up();await expect.poll(()=>actions.length).toBeGreaterThan(before);
});

test('reduced motion does not download unused cat animation sheets',async({page,app})=>{
 app.admin=true;await page.emulateMedia({reducedMotion:'reduce'});const actions=[];page.on('request',r=>{if(r.url().includes('-actions.webp'))actions.push(r.url());});await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toHaveAttribute('data-cats',/liuyi/);await page.waitForTimeout(750);expect(actions).toHaveLength(0);
});
