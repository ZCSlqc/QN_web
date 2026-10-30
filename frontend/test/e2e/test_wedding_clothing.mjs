import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';

test('groom shirt keeps opaque pixels in front and back and remains visible through the coat',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {weddingAppearance}=await import('/src/features/wedding/weddingIdentity.js'),{normalizeAppearance,resolveParts,partUrl,findPart}=await import('/src/features/wedding/catalog.js'),{formalTop}=await import('/src/features/wedding/formalWear.js'),{loadCharacters}=await import('/src/features/wedding/characters.js');
  const a=normalizeAppearance(weddingAppearance('groom')),parts=resolveParts(a),source=new Image();source.src=partUrl(parts.shirt);await source.decode();
  const pixels=[false,true].map(back=>{const top=formalTop(source,a,back),ctx=top.getContext('2d'),p=ctx.getImageData(0,0,top.width,top.height).data;let count=0;for(let i=3;i<p.length;i+=4)if(p[i]>0)count++;return count;});
  const art=await loadCharacters(),canvas=document.createElement('canvas');canvas.width=300;canvas.height=350;const c=canvas.getContext('2d');
  async function sample(shirt){const appearance=await art.ensureAppearance({...a,shirt});c.clearRect(0,0,300,350);c.save();c.translate(150,330);c.scale(2,2);art.draw(c,{x:0,y:0,appearance,direction:'front'},0,true);c.restore();const p=c.getImageData(145,181,14,54).data;let white=0,red=0;for(let i=0;i<p.length;i+=4){if(p[i]>210&&p[i+1]>210&&p[i+2]>210&&p[i+3]>200)white++;if(p[i]-p[i+1]>50&&p[i+3]>200)red++;}return {white,red};}
  const white=await sample(a.shirt),red=await sample(findPart('shirt','Red',p=>p.name.endsWith('5')).id);art.dispose();return {pixels,white,red};
 });for(const n of result.pixels)expect(n).toBeGreaterThan(20000);expect(result.white.white).toBeGreaterThan(20);expect(result.red.red).toBeGreaterThan(20);expect(result.white.white).toBeGreaterThan(result.red.white+20);
});

test('coat can be removed while top, lower garment, shoes and makeup stay independent',async({page,app})=>{
 app.admin=true;app.weddingRole='groom';await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toBeVisible();
 await page.getByRole('button',{name:'我的造型',exact:true}).click();const w=page.locator('.wardrobe'),preview=w.locator('.wardrobe-summary canvas');
 await w.getByRole('button',{name:'造型',exact:true}).click();await expect(w.locator('.wardrobe-categories button')).toHaveText(['上衣','外套','裤子','鞋子','套装']);
 await w.getByRole('button',{name:'日常',exact:true}).click();await w.getByRole('button',{name:'红色',exact:true}).click();await w.getByRole('button',{name:'上衣 5',exact:true}).click();
 await expect(preview).toHaveAttribute('data-appearance',/"coatStyle":"tuxedo"/);
 await w.getByRole('button',{name:'裤子',exact:true}).click();await w.getByRole('button',{name:'旗袍裙摆',exact:true}).click();await w.getByRole('button',{name:'玉绿',exact:true}).click();
 await w.getByRole('button',{name:'鞋子',exact:true}).click();await w.getByRole('button',{name:'细跟高跟鞋',exact:true}).click();await w.getByRole('button',{name:'珍珠白',exact:true}).click();
 await w.getByRole('button',{name:'外套',exact:true}).click();await w.getByRole('button',{name:'不穿外套',exact:true}).click();
 await expect.poll(async()=>JSON.parse(await preview.getAttribute('data-appearance'))).toMatchObject({coatStyle:null,topStyle:null,bottomStyle:'qipao',bottomColor:'jade',shoes:'dress-shoe-stiletto-ivory'});
 expect(JSON.parse(await preview.getAttribute('data-appearance')).shirt).toContain('redshirt5');
 await w.getByRole('button',{name:'日常',exact:true}).click();await expect(w.locator('.formal-grid>button')).toHaveCount(2);await w.getByRole('button',{name:'针织开衫',exact:true}).click();
 await expect(preview).toHaveAttribute('data-appearance',/"coatStyle":"cardigan"/);await expect(preview).toHaveAttribute('data-appearance',/"bottomStyle":"qipao"/);
 await expect(w.getByRole('button',{name:'单穿',exact:true})).toHaveCount(0);await expect(w.getByRole('button',{name:'叠穿',exact:true})).toHaveCount(0);
 await expect(w.locator('.formal-grid .character-preview')).toHaveCount(0);await expect(w.locator('.formal-grid .clothing-preview[aria-busy=true]')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await w.screenshot({path:artifactPath('wedding-coat-picker.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('clothing and full outfit cards never draw anatomy, accessories or shadows',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1500,height:1100});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js'),{outfitPresets}=await import('/src/features/wedding/outfitCatalog.js'),{dressShoes}=await import('/src/features/wedding/dressShoes.js');
  const art=await loadCharacters(),canvas=document.createElement('canvas');canvas.id='clothes-only-proof';canvas.width=1500;canvas.height=720;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#f4eee6';document.body.append(canvas);const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),sources=[];
  c.drawImage=(image,...args)=>{if(image.src)sources.push(image.src);draw(image,...args);};
  const entries=[['formal-tuxedo','shirt','白衬衫'],['formal-tuxedo','coat','礼服外套'],['formal-tuxedo','pants','礼服西裤'],['formal-tuxedo','sets','新郎整套衣物'],['formal-bridal','shirt','婚纱上衣'],['formal-bridal','pants','婚纱裙摆'],['formal-bridal','sets','婚纱整套衣物'],['daily-0','sets','日常整套衣物']];
  for(let i=0;i<entries.length;i++){
   const [id,kind,label]=entries[i],value={...outfitPresets.find(p=>p.id===id).appearance,headwear:'crown',animalHead:'animal-monkey'};if(kind==='shirt')value.coatStyle=null;const a=await art.ensureAppearance(value),col=i%4,row=Math.floor(i/4),box=kind==='sets'?{y:-170,h:400}:kind==='pants'?{y:-96,h:215}:{y:-245,h:250},scale=Math.min(320/340,300/box.h);
   c.save();c.translate(col*375+187.5,row*360+190);c.scale(scale,scale);c.translate(0,-box.y);art.drawClothes(c,a,kind);c.restore();c.fillStyle='#796350';c.font='17px sans-serif';c.fillText(label,col*375+35,row*360+25);
  }
  art.dispose();return sources.filter(s=>/\/(Skin|Hair|Face|pixelAnimal|emoji)\//.test(s)||/Derived\/accessories\//.test(s));
 });expect(result).toEqual([]);await page.locator('#clothes-only-proof').screenshot({path:artifactPath('wedding-clothing-cards.png')});
});

test('heels preserve shoe dimensions and the exact ankle attachment through leg and shoe rotation',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1500,height:1000});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {dressShoes,dressShoeStyles}=await import('/src/features/wedding/dressShoes.js'),{loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js'),{characterMotion}=await import('/src/features/wedding/motions.js'),{rigidSide}=await import('/src/features/wedding/rigidRig.js');
  const art=await loadCharacters(),canvas=document.createElement('canvas'),c=canvas.getContext('2d');canvas.width=500;canvas.height=500;let scaleError=0,anchorError=0;
  const draw=c.drawImage.bind(c);let calls=[];c.drawImage=(image,...args)=>{if(image.src?.includes('/Derived/shoes/'))calls.push({m:c.getTransform(),args});draw(image,...args);};
  for(const shoe of dressShoes){const appearance=await art.ensureAppearance({...makeAppearance(),shoes:shoe.id});for(const leg of [-11,9])for(const swing of [-5,5]){
   const f=characterMotion({},0,true);Object.assign(f.rigidPose,{leftLeg:leg,rightLeg:-leg/2,leftShoe:swing,rightShoe:-swing});calls=[];art.draw(c,{x:0,y:0,appearance,...f},0,true);
   for(let i=0;i<2;i++){const side=i===0?-1:1,r=rigidSide(f.rigidPose,side,f.rigidBindings),call=calls[i],p=new DOMPoint(shoe.anchor.x,shoe.anchor.y).matrixTransform(call.m);scaleError=Math.max(scaleError,Math.abs(Math.hypot(call.m.a,call.m.b)-.25),Math.abs(Math.hypot(call.m.c,call.m.d)-.25));anchorError=Math.max(anchorError,Math.hypot(p.x-r.ankle.x*.25,p.y-r.ankle.y*.25));if(call.args.length!==2)throw Error('resized shoe image');}
  }}
  const sheet=document.createElement('canvas');sheet.id='shoe-proof';sheet.width=1500;sheet.height=400;sheet.style.cssText='position:fixed;inset:0;z-index:99999;background:#f4eee6';document.body.append(sheet);const sc=sheet.getContext('2d');
  for(let i=0;i<dressShoeStyles.length;i++)for(let row=0;row<2;row++){const style=dressShoeStyles[i],image=new Image();image.src=`/wedding/kenney_modular-characters/Derived/shoes/${style.id}-${row?'ivory':'black'}.svg`;await image.decode();sc.save();sc.translate(i*300+10,row*200+55);sc.scale(2.9,2.9);sc.drawImage(image,0,0);sc.restore();sc.fillStyle='#796350';sc.font='16px sans-serif';sc.fillText(style.label,i*300+25,row*200+30);}
  art.dispose();return {scaleError,anchorError};
 });expect(result.scaleError).toBeLessThan(1e-8);expect(result.anchorError).toBeLessThan(1e-5);await page.locator('#shoe-proof').screenshot({path:artifactPath('wedding-shoes-review.png')});
});
