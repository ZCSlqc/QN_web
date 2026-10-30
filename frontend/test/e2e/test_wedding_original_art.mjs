import {test,expect} from '../fixtures/app.mjs';
import fs from 'node:fs/promises';
import sharp from 'sharp';

test('original collection contains 44 padded transparent sprites in matching source and public folders',async()=>{
 const {items}=JSON.parse(await fs.readFile(new URL('../../../asset/wedding/original/catalog.json',import.meta.url),'utf8'));
 expect(items).toHaveLength(44);expect(items.filter(i=>i.uses.includes('handheld'))).toHaveLength(36);
 for(const category of ['drinks','food','meals','desserts'])expect(items.filter(i=>i.category===category)).toHaveLength(6);
 for(const style of ['garden','festive'])expect(items.filter(i=>i.style===style)).toHaveLength(6);
 for(const item of items){
  const source=new URL(`../../../asset${item.image}`,import.meta.url),published=new URL(`../../public${item.image}`,import.meta.url),data=await fs.readFile(source);
  expect(await fs.readFile(published)).toEqual(data);
  const {data:rgba,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect(info.width).toBe(item.width);expect(info.height).toBe(item.height);
  for(let x=0;x<info.width;x++){expect(rgba[x*4+3]).toBe(0);expect(rgba[((info.height-1)*info.width+x)*4+3]).toBe(0);}
  expect(item.image).toMatch(/^\/(wedding\/original\/(drinks|snacks|meals|desserts|flowers\/garden|flowers\/festive|juggling|decorations)|shared\/icons)\//);
 }
});

test('vertical greeting, distinct blessings and calm florist use the actual rig',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion}=await import('/src/features/wedding/motions.js'),{circularMotionHandles,circularHandFrame}=await import('/src/features/wedding/circularArm.js'),{upperPoint}=await import('/src/features/wedding/rigidRig.js');
  const f=characterMotion({gesture:'wave'},1.3),p=upperPoint(circularHandFrame(f.rigidPose,f.rigidBindings,f.circularArm,1).palm,f.rigidPose,f.rigidBindings),e=circularMotionHandles(f.rigidPose,f.rigidBindings,f.circularArm,1).rightElbow.pivot;
  const blessing=characterMotion({gesture:'bless'},1.5),clap=characterMotion({gesture:'clap'},1.5);
  return {dx:Math.abs(p.x-e.x),height:e.y-p.y,poseDifference:Math.abs(blessing.circularArm.bend-clap.circularArm.bend)+Math.abs(blessing.circularArm.shoulder-clap.circularArm.shoulder)};
 });
 expect(result.dx).toBeLessThan(15);expect(result.height).toBeGreaterThan(50);expect(result.poseDifference).toBeGreaterThan(25);
});

test('pet action buttons preserve their simple icons and feedback uses shared original art',async({page,app})=>{
 app.allowedPages=['/pet'];await page.goto('/pet');await expect(page.locator('.touch-actions button').first().locator('span')).toHaveText('♡');await expect(page.locator('.touch-actions button').nth(1).locator('span')).toHaveText('✧');await expect(page.locator('.touch-actions img')).toHaveCount(0);
});

test('petting walks to the cat before reacting and stops beside it',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const scene=page.locator('.wedding-canvas canvas');await expect(scene).toHaveAttribute('data-cats',/liuyi/);
 const before=Number(await scene.getAttribute('data-player-y'));const cat=JSON.parse(await scene.getAttribute('data-cats'))[0];await scene.click({position:{x:cat.x,y:cat.y}});await expect(scene).toHaveAttribute('data-petting-target','liuyi');await expect(page.locator('.wedding-toolbar')).toContainText('正走到六一身边');
 await expect(page.locator('.wedding-toolbar')).toContainText('六一收到你的摸摸',{timeout:15000});expect(Number(await scene.getAttribute('data-player-y'))).not.toBe(before);await expect(scene).toHaveAttribute('data-walking','false');
 const result=await scene.evaluate(canvas=>{const cat=JSON.parse(canvas.dataset.cats)[0];return {cat,distance:Math.hypot(cat.worldX-Number(canvas.dataset.playerX),cat.worldY-Number(canvas.dataset.playerY))};});
 expect(result.cat.reacting).toBe(true);expect(result.distance).toBeGreaterThan(35);expect(result.distance).toBeLessThan(85);
});

test('balloons raise the whole arm on either side and keep their assigned palm',async({page,app},testInfo)=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion}=await import('/src/features/wedding/motions.js'),{circularHandFrame,circularMotionHandles}=await import('/src/features/wedding/circularArm.js'),{upperPoint}=await import('/src/features/wedding/rigidRig.js'),{assignCarryHand,heldPlacement}=await import('/src/features/wedding/heldItems.js'),{items}=await import('/src/features/wedding/amenities.js'),{loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js');
  const source=items.find(i=>i.id==='balloons-festive'),art=await loadCharacters(),appearance=await art.ensureAppearance(makeAppearance()),image=new Image();image.src=source.image;await image.decode();await art.ensureHeldItem(source);
  const canvas=document.createElement('canvas');canvas.id='balloon-hands-review';canvas.width=1200;canvas.height=500;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#f5f0e8';document.body.append(canvas);const ctx=canvas.getContext('2d'),poses=[];
  for(const side of [-1,1]){
   const item=assignCarryHand(source,()=>side<0?.2:.8),f=characterMotion({heldItem:item},0),left=circularHandFrame(f.rigidPose,f.rigidBindings,f.leftCircularArm,-1).palm,right=circularHandFrame(f.rigidPose,f.rigidBindings,f.circularArm,1).palm,palm=upperPoint(side<0?left:right,f.rigidPose,f.rigidBindings),prefix=side<0?'left':'right',a=side<0?f.leftCircularArm:f.circularArm,handles=circularMotionHandles(f.rigidPose,f.rigidBindings,a,side),e=handles[prefix+'Elbow'].pivot,shoulder=handles[prefix+'ShoulderLower'].pivot,p=heldPlacement(item,image,left,right);
   poses.push({side:item.handSide,raised:a.up,upperLift:shoulder.y-e.y,handLift:shoulder.y-palm.y,gripError:Math.hypot(p.grip.x-(side<0?left:right).x,p.grip.y-(side<0?left:right).y)});
   for(const back of [false,true]){ctx.save();ctx.translate((side<0?0:600)+(back?450:150),455);ctx.scale(2,2);art.draw(ctx,{x:0,y:0,appearance,heldItem:item,direction:back?'back':'front'},0,true);ctx.restore();}
  }
  const both=assignCarryHand(items.find(i=>i.id==='gift-festive'),()=>.2);art.dispose();return {poses,both:both.handSide,sourceUnchanged:source.handSide===undefined};
 });
 for(const pose of result.poses){expect(pose.raised).toBe(true);expect(pose.upperLift).toBeGreaterThan(25);expect(pose.handLift).toBeGreaterThan(60);expect(pose.gripError).toBeLessThan(1e-8);}expect(result.poses.map(p=>p.side)).toEqual([-1,1]);expect(result.both).toBe(0);expect(result.sourceUnchanged).toBe(true);
 await page.locator('#balloon-hands-review').screenshot({path:testInfo.outputPath('balloons-left-right-front-back.png')});
});
