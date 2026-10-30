import { test, expect } from "../fixtures/app.mjs";

test("all animal heads share a bottom baseline and load distinct back artwork", async ({page,app},testInfo)=>{
  test.setTimeout(60000);
  app.admin=true;await page.goto('/wedding');
  await expect(page.locator('.wedding-canvas canvas')).toBeVisible({timeout:20000});
  const result=await page.evaluate(async()=>{
    const {loadCharacters}=await import('/src/features/wedding/characters.js');
    const {animalHeads,makeAppearance,emojiHeads}=await import('/src/features/wedding/catalog.js');
    const art=await loadCharacters();
    const sheet=document.createElement('canvas');sheet.width=1200;sheet.height=660;sheet.id='animal-rear-proof';
    sheet.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee5d9;width:1200px;height:660px';document.body.append(sheet);
    const ctx=sheet.getContext('2d'),draw=ctx.drawImage.bind(ctx),calls=[];
    ctx.drawImage=(...args)=>{if(args[0]?.src?.includes('/wedding/pixelAnimal/'))calls.push({src:args[0].src,bottom:args[6]+args[8]});draw(...args);};
    for(let i=0;i<animalHeads.length;i++){
      const appearance=await art.ensureAppearance({...makeAppearance(),animalHead:animalHeads[i].id});
      for(let j=0;j<2;j++)art.draw(ctx,{x:50+i%6*200+j*90,y:310+Math.floor(i/6)*320,appearance,direction:j?'back':'front'},0,true);
    }
    const rear=document.createElement('canvas');rear.width=200;rear.height=220;const rc=rear.getContext('2d');
    const emojiBacks=[];
    for(const item of emojiHeads){
      const appearance=await art.ensureAppearance({...makeAppearance(),animalHead:item.id});
      rc.clearRect(0,0,200,220);art.draw(rc,{x:100,y:200,appearance,direction:'back'},0,true);emojiBacks.push(rear.toDataURL());
    }
    art.dispose();return {calls,emojis:emojiHeads.length,backs:new Set(emojiBacks).size};
  });
  expect(result.calls).toHaveLength(24);
  expect(result.calls.filter(c=>c.src.endsWith('-back.webp'))).toHaveLength(12);
  for(const call of result.calls)expect(call.bottom).toBeCloseTo(-355,5);
  expect(result.emojis).toBe(29);
  expect(result.backs).toBe(7);
  await page.locator('#animal-rear-proof').screenshot({path:testInfo.outputPath('animal-front-back-aligned.png')});
});

test("emoji temporarily changes the head for five seconds and restores appearance", async ({page,app},testInfo)=>{
  app.admin=true;
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/wedding');
  const canvas=page.locator('.wedding-canvas canvas');
  await expect(canvas).toBeVisible();
  const original=await canvas.getAttribute('data-appearance');
  await page.getByRole('button',{name:'emoji',exact:true}).click();
  await expect(page.locator('.emoji-options button')).toHaveCount(8);
  await page.getByRole('button',{name:'表达：飞吻',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-emotion','emoji-kiss');
  await expect(canvas).toHaveAttribute('data-temporary-head',/emoji-/);await expect(page.locator('.wedding-emotions img')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-appearance',original);
  await page.getByRole('button',{name:'emoji',exact:true}).click();
  await page.getByRole('button',{name:'表达：被爱包围',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-emotion','emoji-loved');
  await expect(canvas).toHaveAttribute('data-temporary-head',/emoji-/);await expect(page.locator('.wedding-emotions img')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('emoji-feeling-mobile.png')});
  await expect(canvas).toHaveAttribute('data-emotion','');
  await expect(page.locator('.wedding-emotions img')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-appearance',original);
});

test("curated emoji heads show eight favourites and preserve appearance when removed", async ({page,app},testInfo)=>{
  app.admin=true;
  await page.goto('/wedding');
  const scene=page.locator('.wedding-canvas canvas');
  await expect(scene).toBeVisible();
  const original=JSON.parse(await scene.getAttribute('data-appearance'));
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.locator('.wardrobe').getByRole('button',{name:'emoji',exact:true}).click();
  await expect(page.locator('.part-grid button')).toHaveCount(8);
  await page.getByRole('button',{name:'派对主角',exact:true}).click();
  await expect(page.locator('.wardrobe-summary .character-preview')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button',{name:'更多趣味 · 全部 29 款',exact:true}).click();
  await expect(page.locator('.part-grid button')).toHaveCount(29);
  await page.getByRole('button',{name:'小恶魔',exact:true}).click();
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/emoji-little-devil/);
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await expect(page.locator('.part-grid button')).toHaveCount(29);
  await page.setViewportSize({width:390,height:844});
  await page.locator('.part-grid img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await page.screenshot({path:testInfo.outputPath('emoji-heads-mobile.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'使用人物头像',exact:true}).click();
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/"animalHead":null/);
  const restored=JSON.parse(await scene.getAttribute('data-appearance'));
  expect(restored.hair).toBe(original.hair);expect(restored.face).toBe(original.face);
});

test("face presets use independent features and preserve layout while editing", async ({page,app})=>{
  app.admin=true;
  const faces=[];page.on('request',r=>{if(r.url().includes('face-completes-'))faces.push(r.url());});
  await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.getByRole('button',{name:'五官',exact:true}).click();
  await expect(page.locator('.part-grid canvas')).toHaveCount(4);
  await expect(page.locator('.part-grid img')).toHaveCount(0);
  await page.getByRole('button',{name:'搭配 2',exact:true}).click();
  await page.getByRole('button',{name:'自己搭配五官',exact:true}).click();
  await page.locator('.part-grid button[title="eyeBlue_small"]').click();
  await expect(page.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/eyeblue-small/);
  const a=JSON.parse(await page.locator('.wardrobe-summary canvas').getAttribute('data-appearance'));
  expect(a.faceLayout).toBe('face-completes-face2');expect(a.face).toBe('custom');
  expect(a.mouth).toBe('face-mouth-mouth-teethlower');
  expect(faces).toEqual([]);
});

test("cat sitting lying and greeting artwork mirrors around its feet", async ({page,app},testInfo)=>{
  app.admin=true;
  await page.goto('/wedding');
  await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
  const results=await page.evaluate(async()=>{
    const {loadCats}=await import('/src/features/wedding/cats.js');
    const art=await loadCats();
    const canvas=document.createElement('canvas');canvas.width=180;canvas.height=130;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    return ['sit','lie','greet','observe','walk','trot'].map(state=>{
      const cat={...art.cats[0],x:90,y:110,state,reactingUntil:0,facing:1};
      art.draw(ctx,cat,5000,true);
      const right=ctx.getImageData(0,0,180,130).data;
      ctx.clearRect(0,0,180,130);cat.facing=-1;art.draw(ctx,cat,5000,true);
      const left=ctx.getImageData(0,0,180,130).data;
      let difference=0,mirrorError=0;
      for(let y=0;y<130;y++)for(let x=0;x<180;x++)for(let c=0;c<4;c++){
        const p=(y*180+x)*4+c,q=(y*180+179-x)*4+c;
        difference+=Math.abs(right[p]-left[p]);mirrorError+=Math.abs(right[p]-left[q]);
      }
      ctx.clearRect(0,0,180,130);
      return {state,difference,mirrorError:mirrorError/(180*130*4)};
    });
  });
  for(const result of results){expect(result.difference).toBeGreaterThan(1000);expect(result.mirrorError).toBeLessThan(1);}
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'摸摸安安'}).focus();await page.keyboard.press('Enter');
  const canvas=page.locator('.wedding-canvas canvas');
  await expect.poll(async()=>JSON.parse(await canvas.getAttribute('data-cats')).find(c=>c.id==='anan').facing).toBe(1);
  await page.screenshot({path:testInfo.outputPath('cats-facing.png')});
});

test("original face presets and rear neck layering", async ({page,app},testInfo)=>{
  app.admin=true;await page.goto('/wedding');
  await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
  const order=await page.evaluate(async()=>{
    const {loadCharacters}=await import('/src/features/wedding/characters.js');
    const {makeAppearance, options}=await import('/src/features/wedding/catalog.js');
    const art=await loadCharacters(),canvas=document.createElement('canvas');
    canvas.id='face-proof';canvas.width=1000;canvas.height=640;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee5d9';document.body.append(canvas);
    const c=canvas.getContext('2d'),calls=[];
    const original=c.drawImage.bind(c);
    c.drawImage=(image,...args)=>{calls.push(image.src||'cached');original(image,...args);};
    for(let row=0;row<2;row++) for(let i=0;i<4;i++) {
      const appearance=await art.ensureAppearance({...makeAppearance(),face:options('face')[i].id});
      c.save();c.translate(125+i*250,305+row*320);c.scale(2.1,2.1);
      art.draw(c,{x:0,y:0,appearance,direction:row?'back':'front'},0,true);c.restore();
    }
    art.dispose();
    const neck=calls.findIndex(x=>x.includes('tint1_neck'));
    return {neck,shirt:calls.findIndex(x=>x.includes('blueShirt5')),head:calls.findIndex(x=>x.includes('tint1_head'))};
  });
  expect(order.neck).toBeGreaterThan(-1);
  expect(order.neck).toBeLessThan(order.shirt);
  expect(order.neck).toBeLessThan(order.head);
  await page.locator('#face-proof').screenshot({path:testInfo.outputPath('faces-neck.png')});
  await page.locator('#face-proof').evaluate(el=>el.remove());
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.getByRole('button',{name:'五官',exact:true}).click();
  await expect(page.locator('.part-grid button')).toHaveCount(4);
});

test("formal outfits and expressions preview, apply and restore separates", async ({page,app},testInfo)=>{
  app.admin=true;await page.goto('/wedding');
  const scene=page.locator('.wedding-canvas canvas');await expect(scene).toBeVisible();
  const original=JSON.parse(await scene.getAttribute('data-appearance'));
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.locator('.wardrobe').getByRole('button',{name:'造型',exact:true}).click();
  await page.getByRole('button',{name:'套装',exact:true}).click();await page.getByRole('button',{name:'礼仪',exact:true}).click();
  await page.getByRole('button',{name:'经典连衣裙',exact:true}).click();
  await page.getByRole('button',{name:'雾粉',exact:true}).click();
  await expect(page.getByRole('button',{name:'裤子',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'妆容',exact:true}).click();
  await page.getByRole('button',{name:'五官',exact:true}).click();
  await page.locator('.part-grid button[title="face3"]').click();
  await expect(page.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/face-completes-face3/);
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/"formalStyle":"dress"/);
  const result=await page.evaluate(async()=>{
    const {loadCharacters}=await import('/src/features/wedding/characters.js');
    const {makeAppearance}=await import('/src/features/wedding/catalog.js');
    const {formalColors}=await import('/src/features/wedding/formalWear.js');
    const art=await loadCharacters();const canvas=document.createElement('canvas');canvas.id='formal-proof';canvas.width=1200;canvas.height=740;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee5d9';document.body.append(canvas);const c=canvas.getContext('2d');
    let col=0;
    for(const style of ['suit','dress']) for(const color of formalColors[style]) {
      const appearance=await art.ensureAppearance({...makeAppearance(style==='dress'?3:0),formalStyle:style,formalColor:color.id,face:style==='dress'?'face-completes-face3':'face-completes-face1'});
      for(let row=0;row<3;row++) {
        c.save();c.translate(100+col*200,215+row*245);c.scale(1.45,1.45);
        art.draw(c,{x:0,y:0,appearance,direction:row===1?'back':'front',gesture:row===2?'clap':'idle'},.25,false);c.restore();
      }
      col++;
    }
    const sample=document.createElement('canvas');sample.width=240;sample.height=240;const sc=sample.getContext('2d');
    async function render(changes,direction='front') {const appearance=await art.ensureAppearance({...makeAppearance(),formalStyle:'dress',...changes});sc.clearRect(0,0,240,240);art.draw(sc,{x:120,y:210,appearance,direction},0,true);return sample.toDataURL();}
    const dressA=await render({pants:makeAppearance().pants,leg:'long'});
    const {options}=await import('/src/features/wedding/catalog.js');
    const dressB=await render({pants:options('pants','Red')[0].id,leg:'shorter'});
    const front=await render({});const back=await render({},'back');
    const faces=[];for(const face of ['face-completes-face1','face-completes-face2','face-completes-face3','face-completes-face4'])faces.push(await render({face}));
    art.dispose();return {covered:dressA===dressB,different:front!==back,faces:new Set(faces).size};
  });
  expect(result).toEqual({covered:true,different:true,faces:4});
  await page.locator('#formal-proof').screenshot({path:testInfo.outputPath('formal-outfits.png')});
  await page.locator('#formal-proof').evaluate(el=>el.remove());
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await page.locator('.wardrobe').getByRole('button',{name:'造型',exact:true}).click();
  await page.getByRole('button',{name:'套装',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('formal-mobile.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'上衣',exact:true}).click();await page.getByRole('button',{name:'日常',exact:true}).click();
  await page.getByRole('button',{name:'上衣 5',exact:true}).click();
  await expect(page.getByRole('button',{name:'裤子',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'裤子',exact:true}).click();await page.getByRole('button',{name:'日常',exact:true}).click();await page.getByRole('button',{name:'裤装 3',exact:true}).click();
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/"formalStyle":null/);
  expect(JSON.parse(await scene.getAttribute('data-appearance')).pants).toBe(original.pants);
});

test("wardrobe separates styles from colours and keeps matching silhouettes", async ({page, app}, testInfo) => {
  app.admin = true;
  await page.goto('/wedding');
  await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  await expect(page.locator('.part-grid button')).toHaveCount(14);
  await page.getByRole('button',{name:'长发 1',exact:true}).click();
  await page.getByRole('button',{name:'金色',exact:true}).click();
  await expect(page.locator('.character-preview canvas')).toHaveAttribute('data-appearance',/blondewoman4/);
  await expect(page.getByRole('button',{name:'长发 1',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'米棕',exact:true}).click();
  await expect(page.locator('.character-preview canvas')).toHaveAttribute('data-appearance',/tanwoman5/);
  await page.locator('.wardrobe').getByRole('button',{name:'造型',exact:true}).click();
  for (const [tab,count] of [['上衣',8],['裤子',4],['鞋子',5]]) {
    await page.getByRole('button',{name:tab,exact:true}).click();
    await expect(page.locator('.part-grid button')).toHaveCount(count);
  }
  const result = await page.evaluate(async()=>{
    const {options,styledSlots,styleKey,styleVariant,makeAppearance,hairAnchor} = await import('/src/features/wedding/catalog.js');
    const {loadCharacters} = await import('/src/features/wedding/characters.js');
    const failures=[];
    for(const slot of styledSlots) for(const part of options(slot)) {
      for(const group of new Set(options(slot).map(p=>p.group))) {
        const variant=styleVariant(part,group);
        if(!variant || styleKey(variant)!==styleKey(part)) failures.push(part.id+':'+group);
      }
    }
    const art=await loadCharacters();
    const canvas=document.createElement('canvas');canvas.id='hair-proof';canvas.width=1200;canvas.height=660;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee5d9';document.body.append(canvas);
    const c=canvas.getContext('2d');
    for(let row=0;row<3;row++) for(let n=1;n<=8;n++) {
      const part=options('hair',['Black','Blonde','Red'][row]).find(p=>p.name.endsWith('Man'+n));
      const appearance=await art.ensureAppearance({...makeAppearance(),hair:part.id});
      c.save();c.translate(75+(n-1)*150,210+row*220);c.scale(1.4,1.4);
      art.draw(c,{x:0,y:0,appearance,direction:'front'},0,true);c.restore();
      c.fillStyle='#45372c';c.font='14px sans-serif';c.fillText(String(n),70+(n-1)*150,218+row*220);
    }
    art.dispose();
    return {failures, anchors:options('hair','Black').filter(p=>/Man[258]$/.test(p.name)).map(p=>hairAnchor(p).y+p.height)};
  });
  expect(result.failures).toEqual([]);
  expect(result.anchors).toEqual([-411,-411,-411]);
  await page.locator('#hair-proof').screenshot({path:testInfo.outputPath('hair-alignment.png')});
  await page.locator('#hair-proof').evaluate(el=>el.remove());
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'妆容',exact:true}).click();
  await page.getByRole('button',{name:'发型',exact:true}).click();
  await page.screenshot({path:testInfo.outputPath('style-colour-mobile.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("animal heads replace facial parts, preview all choices and restore the human appearance", async ({ page, app }, testInfo) => {
  app.admin = true;
  await page.goto("/wedding");
  const scene = page.locator(".wedding-canvas canvas");
  await expect(scene).toBeVisible();
  const original = JSON.parse(await scene.getAttribute("data-appearance"));
  await page.getByRole("button", { name: "我的造型", exact: true }).click();
  await page.getByRole("button", { name: "动物", exact: true }).click();
  await expect(page.locator('.part-grid button')).toHaveCount(12);
  const results = await page.evaluate(async () => {
    const { loadCharacters } = await import('/src/features/wedding/characters.js');
    const { animalHeads, makeAppearance } = await import('/src/features/wedding/catalog.js');
    const art = await loadCharacters();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 660;
    canvas.id = 'animal-contact-sheet'; canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee5d9;width:1200px;height:660px';
    document.body.append(canvas); const ctx = canvas.getContext('2d');
    for (let i=0;i<animalHeads.length;i++) {
      const appearance = await art.ensureAppearance({...makeAppearance(), animalHead:animalHeads[i].id});
      for (let j=0;j<2;j++) art.draw(ctx,{x:50+(i%6)*200+j*90,y:310+Math.floor(i/6)*320,appearance,direction:j?'back':'front'},0,true);
    }
    const sample = document.createElement('canvas'); sample.width=220; sample.height=230;
    const c=sample.getContext('2d');
    async function render(face,hair) {
      const appearance=await art.ensureAppearance({...makeAppearance(),animalHead:animalHeads[0].id,face,hair});
      c.clearRect(0,0,220,230);art.draw(c,{x:110,y:210,appearance,direction:'front'},0,true);return sample.toDataURL();
    }
    const first=await render('custom',makeAppearance(0).hair);
    const second=await render(makeAppearance().face,makeAppearance(3).hair);
    art.dispose(); return {same:first===second};
  });
  expect(results.same).toBe(true);
  await page.locator('#animal-contact-sheet').screenshot({path:testInfo.outputPath('animal-heads-front-back.png')});
  await page.locator('#animal-contact-sheet').evaluate(el=>el.remove());
  await page.getByRole('button',{name:'猴子',exact:true}).click();
  await expect(page.getByRole('button',{name:'五官',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'发型',exact:true})).toBeVisible();
  await expect(page.locator('.character-preview')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/animal-monkey/);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'我的造型',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('animal-wardrobe-mobile.png')});
  await page.getByRole('button',{name:'使用人物头像',exact:true}).click();
  await expect(page.getByRole('button',{name:'五官',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'穿好啦',exact:true}).click();
  await expect(scene).toHaveAttribute('data-appearance',/"animalHead":null/);
  const restored=JSON.parse(await scene.getAttribute('data-appearance'));
  expect(restored.hair).toBe(original.hair);
  expect(restored.face).toBe(original.face);
});

test("five cats respond to touch and blessings without moving the guest", async ({ page, app }, testInfo) => {
  app.admin = true;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/wedding");
  const canvas = page.locator(".wedding-canvas canvas");
  await expect(canvas).toHaveAttribute("data-cats", /liuyi/);
  const cats = () => canvas.getAttribute("data-cats").then(JSON.parse);
  expect((await cats()).map((cat) => cat.id)).toEqual(["liuyi", "anan", "guagua", "huahua", "heihei"]);
  const before = await canvas.getAttribute("data-player-x");
  const liuyi = (await cats())[0];
  await canvas.click({ position: { x: liuyi.x, y: liuyi.y } });
  await expect(page.locator(".wedding-toolbar")).toContainText("六一收到你的摸摸");
  await expect(page.getByRole("button", { name: "摸摸六一" })).toHaveClass(/active/);
  await expect(canvas).toHaveAttribute("data-player-x", before);
  await expect.poll(async () => (await cats()).filter((cat) => cat.reacting).length).toBe(0);
  await page.getByRole("button", { name: "♡ 祝福", exact: true }).click();
  await expect.poll(async () => (await cats()).filter((cat) => cat.reacting).length).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("wedding-cats.png") });
  await expect(canvas).toHaveAttribute("data-blessing-arrivals", "2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Math.round((await cats())[0].x)).toBe(195);
  await expect.poll(async()=>Number(await canvas.getAttribute('data-character-scale'))).toBeCloseTo(844/900,3);
  const cat = (await cats())[0];
  await canvas.click({ position: { x: cat.x, y: cat.y } });
  await expect(page.getByRole("button", { name: "摸摸六一" })).toHaveClass(/active/);
  await page.screenshot({ path: testInfo.outputPath("wedding-cats-mobile.png") });
  await expect.poll(async () => (await cats()).filter((item) => item.reacting).length).toBe(0);
  await page.mouse.move(cat.x, cat.y);
  await page.mouse.down();
  await page.mouse.move(cat.x + 90, cat.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await canvas.getAttribute("data-pan"))).toBeGreaterThan(50);
  expect((await cats()).some((item) => item.reacting)).toBe(false);
  await expect(canvas).toHaveAttribute("data-player-x", before);
  await page.getByRole("button", { name: "摸摸安安" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".wedding-toolbar")).toContainText("安安收到你的摸摸");
});

test("database personalities drive autonomous cats and petting stops a walking cat", async ({ page, app }, testInfo) => {
  app.admin = true;
  for (const cat of app.weddingCats) {
    Object.assign(cat, { rest_weight: 100, explore_weight: 0, social_weight: 0, approach_weight: 0 });
  }
  Object.assign(app.weddingCats[0], { personality: "playful", rest_weight: 0, explore_weight: 100, speed: 70 });
  await page.goto('/wedding');
  const canvas=page.locator('.wedding-canvas canvas');
  await expect(canvas).toHaveAttribute('data-cats', /playful/);
  const cats=()=>canvas.getAttribute('data-cats').then(JSON.parse);
  await expect.poll(async()=> (await cats())[0].stride).toBeGreaterThan(10);
  await page.screenshot({path:testInfo.outputPath('wedding-cats-roaming.png')});
  await page.getByRole('button',{name:'摸摸六一'}).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async()=> (await cats())[0].state).toBe('greet');
  const point=(await cats())[0];
  await page.waitForTimeout(250);
  const stopped=(await cats())[0];
  expect(stopped.worldX).toBe(point.worldX);
  expect(stopped.worldY).toBe(point.worldY);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(async()=> (await cats()).some(c=>['walk','trot'].includes(c.state))).toBe(false);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('wedding-cats-personalities-mobile.png')});
});

test("NPC configuration failure is visible and retry reads the database again", async ({page,app})=>{
  app.admin=true; app.fail.add('/wedding/cats');
  await page.goto('/wedding');
  await expect(page.getByRole('alert')).toContainText('猫咪资料');
  app.fail.delete('/wedding/cats');
  await page.getByRole('button',{name:'重新加载'}).click();
  await expect(page.locator('.wedding-canvas canvas')).toHaveAttribute('data-cats',/clingy/);
});

test("cat asset failure can be retried", async ({ page, app }) => {
  app.admin = true;
  await page.route("**/wedding/cats/anan.webp", (route) => route.abort());
  await page.goto("/wedding");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/wedding/cats/anan.webp");
  await page.getByRole("button", { name: "重新加载" }).click();
  await expect(page.locator(".wedding-canvas canvas")).toHaveAttribute("data-cats", /anan/);
});

test("immersive wedding has no navigation and supports avatar interaction", async ({
  page,
  app,
}, testInfo) => {
  app.admin = true;
  app.nickname = "来宾小雨";
  await page.goto("/wedding");
  await expect(page.locator(".wedding-canvas canvas")).toBeVisible();
  await expect(page.locator(".wedding-canvas canvas")).toHaveAttribute(
    "data-renderer",
    "2d",
  );
  await expect(page.locator(".nav-bar")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "爱的婚礼" })).toBeVisible();
  await page.getByRole("button", { name: "♪ 跳舞" }).click();
  await expect(page.locator(".wedding-toolbar")).toContainText("跳一支舞");
  await page.getByRole("button", { name: "我的造型" }).click();
  await expect(page.locator(".wardrobe header p")).toHaveText("来宾小雨");
  await expect(page.locator('.wardrobe input:not([type="radio"])')).toHaveCount(
    0,
  );
  await page.locator('.part-grid button[title="blackWoman3"]').click();
  await page.getByRole("button", { name: "穿好啦" }).click();
  await expect(page.locator(".wedding-labels")).toContainText("来宾小雨");
  await expect(page.locator(".wedding-canvas canvas")).toHaveAttribute(
    "data-appearance",
    /hair-black-blackwoman3/,
  );
  await page.screenshot({ path: testInfo.outputPath("wedding-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("wedding-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "← 返回" }).click();
  await expect(page).toHaveURL(/\/index$/);
});

test("name falls back to the account and clapping closes at the chest without crossed hands", async ({
  page,
  app,
}, testInfo) => {
  app.admin = true;
  await page.goto("/wedding");
  const canvas = page.locator(".wedding-canvas canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".wedding-labels")).toContainText("测试管理员");
  const poses = await page.evaluate(async () => {
    const { clapPose } = await import("/src/features/wedding/characters.js");
    return Array.from({ length: 101 }, (_, i) => clapPose(i / 100));
  });
  expect(Math.min(...poses.map((p) => p.handX))).toBeCloseTo(30.5);
  expect(Math.max(...poses.map((p) => p.handX))).toBeCloseTo(65);
  expect(poses.every((p) => p.handX >= 30.5 && p.handY === -260)).toBe(true);
  await page.getByRole("button", { name: "👏 鼓掌" }).click();
  await expect(canvas).toHaveAttribute("data-gesture", "clap");
  await page.screenshot({ path: testInfo.outputPath("wedding-clap.png") });
  await expect(canvas).toHaveAttribute("data-gesture", "idle");
});

test("orthographic people keep their size while walking; mobile drag pans without moving the person", async ({
  page,
  app,
}) => {
  app.admin = true;
  await page.goto("/wedding");
  const scene = page.locator(".wedding-canvas canvas");
  await expect(scene).toHaveAttribute("data-player-y", "750.0");
  const scale = await scene.getAttribute("data-character-scale");
  await scene.focus();
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () => Number(await scene.getAttribute("data-player-y")))
    .toBeLessThan(700);
  await expect(scene).toHaveAttribute("data-character-scale", scale);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(scene).toHaveAttribute("data-pan", "0.0");
  const before = await scene.getAttribute("data-player-x");
  await page.mouse.move(120, 430);
  await page.mouse.down();
  await page.mouse.move(310, 430, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await scene.getAttribute("data-pan")))
    .toBeGreaterThan(100);
  await expect(scene).toHaveAttribute("data-player-x", before);
  await page.getByRole("button", { name: "回到我的位置" }).click();
  await expect(scene).toHaveAttribute("data-pan", "0.0");
});

test("failed scene asset offers a working retry", async ({ page, app }) => {
  app.admin = true;
  await page.route("**/wedding/background/garden-orthographic.webp", (route) => route.abort());
  await page.goto("/wedding");
  await expect(page.getByRole("alert")).toContainText("花园素材暂时没有加载好");
  await page.unroute("**/wedding/background/garden-orthographic.webp");
  await page.getByRole("button", { name: "重新加载" }).click();
  await expect(page.locator(".wedding-canvas canvas")).toBeVisible();
  await page.getByRole("link", { name: "← 返回" }).click();
  await expect(page.locator(".wedding-canvas")).toHaveCount(0);
});

test("leaving while the background loads cannot mount a late canvas", async ({
  page,
  app,
}) => {
  app.admin = true;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/wedding/background/garden-orthographic.webp", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto("/wedding", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText("正在布置花园");
  await page.getByRole("link", { name: "← 返回" }).click();
  release();
  await expect(page).toHaveURL(/\/index$/);
  await expect(page.locator(".wedding-canvas")).toHaveCount(0);
});

test("all original parts are reachable through matched outfit choices", async ({
  page,
  app,
}) => {
  app.admin = true;
  await page.goto("/wedding");
  await expect(page.locator(".wedding-canvas canvas")).toBeVisible();
  const result = await page.evaluate(async () => {
    const { allParts, makeAppearance, resolveParts, options } =
      await import("/src/features/wedding/catalog.js");
    const reached = new Set(),
      missing = [];
    for (const part of allParts) {
      if (part.slot === "face" || part.name.endsWith("_short")) continue; // Flattened faces are replaced by feature presets.
      const a = makeAppearance();
      if (
        ["head", "neck", "hand", "arm"].includes(part.slot) ||
        part.original.startsWith("Skin/")
      )
        a.skin = part.group;
      else if (part.slot === "sleeve") {
        a.shirt = options("shirt", part.group)[0].id;
        a.sleeve = part.name.split("_").pop();
      } else if (part.slot === "leg") {
        a.pants = options("pants", part.group)[0].id;
        a.leg = part.name.split("_").pop();
      } else if (part.slot === "nose") {
        a.skin = part.group;
        a.nose = part.name.slice(-1);
        a.face = "custom";
      } else {
        a[part.slot] = part.id;
        if (["eyes", "mouth", "eyebrows"].includes(part.slot))
          a.face = "custom";
      }
      for (const value of Object.values(resolveParts(a)))
        if (value) reached.add(value.id);
      if (
        !Object.values(resolveParts(a)).some((value) => value?.id === part.id)
      )
        missing.push(part.id);
    }
    return { count: allParts.filter(p=>p.slot !== "face"&&!p.name.endsWith("_short")).length, reached: [...reached].filter(id=>allParts.some(p=>p.id===id)).length, missing };
  });
  expect(result).toEqual({ count: 404, reached: 404, missing: [] });
});

test("wardrobe matches skin and clothing parts, and blessing reaches both newlyweds", async ({
  page,
  app,
}, testInfo) => {
  app.admin = true;
  app.nickname = "琪琪的朋友";
  await page.goto("/wedding");
  const canvas = page.locator(".wedding-canvas canvas");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "我的造型", exact: true }).click();
  await expect(page.locator(".part-grid button")).toHaveCount(14);
  await page.getByRole("button", { name: "肤色", exact: true }).click();
  await page.locator('.part-grid button[title="tint8_head"]').click();
  await page.locator('.wardrobe').getByRole('button',{name:'造型',exact:true}).click();
  await page.getByRole("button", { name: "上衣", exact: true }).click();
  await page.getByRole("button", { name: "红色", exact: true }).click();
  await page.locator('.part-grid button[title="redShirt6"]').click();
  await page.getByRole("radio", { name: "短袖", exact: true }).check();
  await page.getByRole("button", { name: "裤子", exact: true }).click();
  await page.getByRole("button", { name: "白色", exact: true }).click();
  await page.locator('.part-grid button[title="pantsWhite2"]').click();
  await page.getByRole("radio", { name: "短裤", exact: true }).check();
  await expect(page.locator(".character-preview")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".character-preview canvas")).toHaveAttribute(
    "data-appearance",
    /pants-white-pantswhite2/,
  );
  await page
    .locator(".part-grid img")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page.screenshot({
    path: testInfo.outputPath("wedding-full-wardrobe.png"),
  });
  await page.getByRole("button", { name: "穿好啦", exact: true }).click();
  await expect(page.locator(".wardrobe")).toHaveCount(0);
  const appearance = JSON.parse(await canvas.getAttribute("data-appearance"));
  expect(appearance).toMatchObject({
    skin: "Tint 8",
    sleeve: "shorter",
    leg: "shorter",
    face: "custom",
  });
  await page.getByRole("button", { name: "♡ 祝福", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-heart-count", "2");
  await expect(canvas).toHaveAttribute("data-blessing-targets", "琪琪,妮妮");
  await page.getByRole("button", { name: "♡ 祝福", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-heart-count", "2");
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath("wedding-blessing.png") });
  await expect(canvas).toHaveAttribute("data-heart-count", "0");
  await expect(canvas).toHaveAttribute("data-blessing-arrivals", "2");
  await page.getByRole("button", { name: "♪ 跳舞", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-gesture", "dance");
  await page.getByRole("button", { name: "🚶 走路", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-gesture", "idle");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "我的造型", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("wedding-wardrobe-mobile.png"),
  });
});
