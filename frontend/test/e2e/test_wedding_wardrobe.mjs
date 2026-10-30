import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';

test('makeup and outfit groups preserve independent clothes and work on mobile',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const scene=page.locator('.wedding-canvas canvas');await expect(scene).toBeVisible();
 await page.getByRole('button',{name:'我的造型',exact:true}).click();const wardrobe=page.locator('.wardrobe');
 await expect(wardrobe.locator('.wardrobe-sections button')).toHaveText(['妆容','造型']);
 await expect(wardrobe.locator('.wardrobe-categories button')).toHaveText(['发型','头饰','五官','肤色','emoji','动物']);
 await wardrobe.getByRole('button',{name:'动物',exact:true}).click();await wardrobe.getByRole('button',{name:'猴子',exact:true}).click();
 await wardrobe.getByRole('button',{name:'发型',exact:true}).click();await wardrobe.getByRole('button',{name:'长发 3',exact:true}).click();
 await expect(wardrobe.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/"animalHead":null/);
 await wardrobe.getByRole('button',{name:'造型',exact:true}).click();
 await expect(wardrobe.locator('.wardrobe-categories button')).toHaveText(['上衣','外套','裤子','鞋子','套装']);
 for(const name of ['上衣','外套','裤子','鞋子','套装']){await wardrobe.getByRole('button',{name,exact:true}).click();await expect(wardrobe.getByRole('navigation',{name:'穿搭场合'}).getByRole('button')).toHaveText(['日常','礼仪']);}
 await expect(wardrobe.getByRole('button',{name:'单穿',exact:true})).toHaveCount(0);await expect(wardrobe.getByRole('button',{name:'叠穿',exact:true})).toHaveCount(0);
 await wardrobe.getByRole('button',{name:'礼仪',exact:true}).click();await expect(wardrobe.locator('.formal-grid>button')).toHaveCount(8);
 await wardrobe.getByRole('button',{name:'白色婚纱',exact:true}).click();
 await expect(wardrobe.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/"formalColor":"white"/);
 await expect(wardrobe.locator('.formal-grid .character-preview')).toHaveCount(0);await expect(wardrobe.locator('.formal-grid .clothing-preview[aria-busy=true]')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await wardrobe.screenshot({path:artifactPath('wedding-wardrobe-mobile.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await wardrobe.getByRole('button',{name:'裤子',exact:true}).click();await wardrobe.getByRole('button',{name:'日常',exact:true}).click();await wardrobe.getByRole('button',{name:'裤装 2',exact:true}).click();
 await wardrobe.getByRole('radio',{name:'短裤',exact:true}).check();await wardrobe.getByRole('button',{name:'鞋子',exact:true}).click();await wardrobe.getByRole('button',{name:'日常',exact:true}).click();await wardrobe.getByRole('button',{name:'鞋子 3',exact:true}).click();
 await wardrobe.getByRole('button',{name:'穿好啦',exact:true}).click();
 await expect.poll(async()=>JSON.parse(await scene.getAttribute('data-appearance'))).toMatchObject({topStyle:'bridal',coatStyle:null,bottomStyle:null,leg:'shorter',veil:false});
 await page.getByRole('button',{name:'我的造型',exact:true}).click();await wardrobe.getByRole('button',{name:'造型',exact:true}).click();await wardrobe.getByRole('button',{name:'裤子',exact:true}).click();await wardrobe.getByRole('button',{name:'礼仪',exact:true}).click();await wardrobe.getByRole('button',{name:'婚纱裙摆',exact:true}).click();
 await wardrobe.getByRole('button',{name:'穿好啦',exact:true}).click();await expect(scene).toHaveAttribute('data-appearance',/"matchedBottom":true/);
});

for(const role of ['groom','bride'])test(`owner controls the existing ${role} and wears its default wedding outfit`,async({page,app})=>{
 app.admin=true;app.weddingRole=role;app.nickname=role==='groom'?'琪琪':'妮妮';await page.goto('/wedding');
 const scene=page.locator('.wedding-canvas canvas');await expect(scene).toHaveAttribute('data-player-role',role);
 const appearance=JSON.parse(await scene.getAttribute('data-appearance'));expect(appearance.formalStyle).toBe(role==='groom'?'tuxedo':'bridal');
 if(role==='groom')expect(appearance.shirt).toContain('white');else expect(appearance.headwear).toBe('veil');
 const people=JSON.parse(await scene.getAttribute('data-people'));expect(people).toHaveLength(6);expect(people.filter(p=>p.name===app.nickname)).toHaveLength(1);
 await page.getByRole('button',{name:'我的造型',exact:true}).click();const wardrobe=page.locator('.wardrobe');
 await wardrobe.getByRole('button',{name:'头饰',exact:true}).click();await expect(wardrobe.locator('.part-grid>button')).toHaveCount(7);await wardrobe.getByRole('button',{name:'皇冠',exact:true}).click();
 await expect(wardrobe.locator('.wardrobe-summary canvas')).toHaveAttribute('data-appearance',/"headwear":"crown"/);
 await wardrobe.getByRole('button',{name:'造型',exact:true}).click();await wardrobe.getByRole('button',{name:'外套',exact:true}).click();await expect(wardrobe.locator('.formal-grid>button')).toHaveCount(4);
 await wardrobe.getByRole('button',{name:'礼服外套',exact:true}).click();
 await wardrobe.getByRole('button',{name:'上衣',exact:true}).click();await wardrobe.getByRole('button',{name:'日常',exact:true}).click();await wardrobe.getByRole('button',{name:'白色',exact:true}).click();await wardrobe.getByRole('button',{name:'上衣 5',exact:true}).click();
 await wardrobe.getByRole('button',{name:'穿好啦',exact:true}).click();await expect(scene).toHaveAttribute('data-appearance',/"formalStyle":"tuxedo"/);
 expect(JSON.parse(await scene.getAttribute('data-appearance')).shirt).toContain('white');
});

test('head accessories share the head transform and stay above hair in both views',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1400,height:1000});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {headwearOptions}=await import('/src/features/wedding/headwear.js'),{loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance,resolveParts}=await import('/src/features/wedding/catalog.js'),{characterMotion}=await import('/src/features/wedding/motions.js');
  const art=await loadCharacters(),canvas=document.createElement('canvas');canvas.id='headwear-review';canvas.width=1400;canvas.height=680;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee9e2';document.body.append(canvas);const c=canvas.getContext('2d'),draw=c.drawImage.bind(c);let error=0,orderError=0;
  for(let i=0;i<headwearOptions.length;i++)for(let back=0;back<2;back++){
   const option=headwearOptions[i],a=await art.ensureAppearance({...makeAppearance(4),headwear:option.id,veil:option.id==='veil'}),parts=resolveParts(a),f=characterMotion({},0,true);f.rigidPose.head=16;let headMatrix,hairOrder=-1,accessoryOrder=-1,count=0;
   c.drawImage=(im,...args)=>{count++;if(im.src?.endsWith('tint1_head.png'))headMatrix=c.getTransform().translate(parts.head.width/2,510);if(im.src?.includes('/Hair/'))hairOrder=count;if(im.src?.endsWith(`${option.id==='veil'?'veil':option.id}-${back?'back':'front'}.svg`)&&option.id!=='none'&&(option.id!=='veil'||!back)){accessoryOrder=count;const m=c.getTransform().translate(140,option.id==='veil'?530:610);if(headMatrix)for(const key of ['a','b','c','d','e','f'])error=Math.max(error,Math.abs(m[key]-headMatrix[key]));}draw(im,...args);};
   c.save();c.translate(i*200+100,310+back*340);c.scale(1.6,1.6);art.draw(c,{x:0,y:0,appearance:a,direction:back?'back':'front',...f},0,true);c.restore();if(option.id!=='none'&&!(option.id==='veil'&&back)&&accessoryOrder<=hairOrder)orderError++;c.fillStyle='#6e5f50';c.font='15px sans-serif';c.fillText(option.label,i*200+60,25+back*340);
  }art.dispose();return {error,orderError};
 });expect(result.error).toBeLessThan(1e-8);expect(result.orderError).toBe(0);await page.locator('#headwear-review').screenshot({path:artifactPath('wedding-headwear-review.png')});
});

test('claimed items enter actual hands, pause for gestures and return afterwards',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const scene=page.locator('.wedding-canvas canvas');await expect(scene).toBeVisible();
 const menu=page.getByRole('navigation',{name:'婚礼招待'}),dialog=page.locator('.amenity-dialog');
 await menu.getByRole('button',{name:'花礼管家',exact:false}).click();await dialog.getByRole('button',{name:'领取红色金带礼盒',exact:true}).click();
 await expect(scene).toHaveAttribute('data-held-item','gift-box-red-gold');await expect(scene).toHaveAttribute('data-carry-mode','two-hands');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'👏 鼓掌',exact:true}).click();await expect(scene).toHaveAttribute('data-carry-mode','none');await expect(scene).toHaveAttribute('data-held-item','gift-box-red-gold');
 await expect(scene).toHaveAttribute('data-carry-mode','two-hands',{timeout:5000});
 await menu.getByRole('button',{name:'美食与饮品',exact:false}).click();await dialog.getByRole('button',{name:'领取可乐',exact:true}).click();await expect(scene).toHaveAttribute('data-held-item','cola');await expect(scene).toHaveAttribute('data-carry-mode','one-hand');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'收起领取物品',exact:true}).click();await expect(scene).toHaveAttribute('data-held-item','');
 const people=JSON.parse(await scene.getAttribute('data-people'));expect(people.find(p=>p.name==='妮妮')).toMatchObject({formalStyle:'bridal',formalColor:'white'});expect(people.some(p=>p.heldItem)).toBe(true);
});

test('resting palms mirror exactly and hand props follow the unwarped rig in both views',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1600,height:1000});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion}=await import('/src/features/wedding/motions.js'),{circularHandFrame}=await import('/src/features/wedding/circularArm.js'),{heldPlacement}=await import('/src/features/wedding/heldItems.js'),{items}=await import('/src/features/wedding/amenities.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js'),{loadCharacters}=await import('/src/features/wedding/characters.js');
  const idle=characterMotion({},0,false),left=circularHandFrame(idle.rigidPose,idle.rigidBindings,idle.leftCircularArm,-1).palm,right=circularHandFrame(idle.rigidPose,idle.rigidBindings,idle.circularArm,1).palm;
  const art=await loadCharacters(),a=await art.ensureAppearance(makeAppearance()),canvas=document.createElement('canvas');canvas.id='handheld-review';canvas.width=1600;canvas.height=760;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#f5f0e8';document.body.append(canvas);const c=canvas.getContext('2d');let maxGripError=0,maxScaleError=0;
  const ids=['bouquet-blush-sticker','gift-box-mint-gold','cola','burger','dumpling-platter','balloon-bunch-burgundy-cream'];
  for(let i=0;i<ids.length;i++){
   const item=items.find(p=>p.id===ids[i]);await art.ensureHeldItem(item);const image=new Image();image.src=item.image;await image.decode();
   for(let sample=0;sample<8;sample++){
    const f=characterMotion({heldItem:item,walking:true},sample/3,false),l=circularHandFrame(f.rigidPose,f.rigidBindings,f.leftCircularArm,-1).palm,r=circularHandFrame(f.rigidPose,f.rigidBindings,f.circularArm,1).palm,p=heldPlacement(item,image,l,r),anchor=p.two?[.5,item.category==='meals'?.91:.86]:item.anchors.hand;
    maxGripError=Math.max(maxGripError,Math.hypot(p.x+anchor[0]*p.width-p.grip.x,p.y+anchor[1]*p.height-p.grip.y));maxScaleError=Math.max(maxScaleError,Math.abs(p.width/p.height-image.naturalWidth/image.naturalHeight));
   }
   for(let back=0;back<2;back++){const col=i%3,row=Math.floor(i/3);c.save();c.translate(col*530+125+back*250,row*380+350);c.scale(2,2);art.draw(c,{x:0,y:0,appearance:a,direction:back?'back':'front',heldItem:item},0,true);c.restore();c.fillStyle='#6e5f50';c.font='15px sans-serif';c.fillText(item.name+(back?' · 背面':' · 正面'),col*530+35+back*250,row*380+30);}
  }
  art.dispose();return {restError:Math.max(Math.abs(left.y-right.y),Math.abs(left.x+right.x)),maxGripError,maxScaleError};
 });expect(result.restError).toBeLessThan(1e-8);expect(result.maxGripError).toBeLessThan(1e-8);expect(result.maxScaleError).toBeLessThan(1e-8);
 await page.locator('#handheld-review').screenshot({path:artifactPath('wedding-handheld-review.png')});
});
