import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';
import fs from 'node:fs';
const assetRoot=new URL('../../public/wedding/kenney_modular-characters/',import.meta.url);
test('generated SVG assets retain original geometry and separate outerwear layers',async({page,app})=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../../../asset/wedding/kenney_modular-characters/Derived/catalog.json',import.meta.url),'utf8'));expect(catalog.assets.length).toBeGreaterThan(90);
 for(const asset of catalog.assets){const svg=fs.readFileSync(new URL(asset.file,assetRoot),'utf8');expect(svg).toContain('<svg');expect(svg).not.toContain('<image');}
 const shirt=fs.readFileSync(new URL('Derived/templates/shirt.svg',assetRoot),'utf8'),originalPath=shirt.match(/d="([^"]+)"/)[1];expect(fs.readFileSync(new URL('Derived/formal/suit-navy-outer-front.svg',assetRoot),'utf8')).toContain(originalPath);
 app.admin=true;await page.setViewportSize({width:1600,height:1200});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js'),{formalStyles,formalColors,isSuitStyle,isCoatStyle}=await import('/src/features/wedding/formalWear.js'),{weddingAppearance}=await import('/src/features/wedding/weddingIdentity.js');
  const art=await loadCharacters(),canvas=document.createElement('canvas');canvas.id='new-formal-proof';canvas.width=1600;canvas.height=Math.ceil(formalStyles.length/4)*380;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#eee9e2';document.body.append(canvas);const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),orders=[];
  for(let i=0;i<formalStyles.length;i++)for(let back=0;back<2;back++){
   const style=formalStyles[i],a=await art.ensureAppearance({...isSuitStyle(style.id)?weddingAppearance('groom'):makeAppearance(4),formalStyle:style.id,formalColor:formalColors[style.id][0].id,veil:!!style.veil,sleeve:style.sleeve}),calls=[],x=i%4*400,y=Math.floor(i/4)*380;
   c.drawImage=(im,...args)=>{calls.push(im.width===153&&im.height===47?'waist':im.width===153&&im.height===174?'inner':im.src||'cache');draw(im,...args);};c.save();c.translate(x+100+back*200,y+350);c.scale(2,2);art.draw(c,{x:0,y:0,appearance:a,direction:back?'back':'front'},0,true);c.restore();
   const outer=calls.findIndex(s=>s.includes('-outer-')),inner=calls.findIndex(s=>s==='inner'),waist=calls.findIndex(s=>s==='waist'),lastHand=calls.findLastIndex(s=>s.endsWith('tint1_hand.png'));orders.push({outer,inner,waist,lastHand,coat:isCoatStyle(style.id)});c.fillStyle='#62594f';c.font='16px sans-serif';c.fillText(`${style.label} · ${back?'背面':'正面'}`,x+35+back*200,y+28);
  }art.dispose();return orders;
 });
 for(const r of result){expect(r.waist).toBeGreaterThan(r.inner);if(r.coat)expect(r.outer).toBeGreaterThan(r.waist);else expect(r.outer).toBeLessThan(r.waist);expect(r.lastHand).toBeGreaterThan(r.outer);}
 await page.locator('#new-formal-proof').screenshot({path:artifactPath('wedding-original-svg-outfits.png')});await page.locator('#new-formal-proof').evaluate(el=>el.remove());
});
test('choreography preserves rigid joints, clapping contact and jump landing',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion,danceMoves,actionDuration}=await import('/src/features/wedding/motions.js'),{rigidSide}=await import('/src/features/wedding/rigidRig.js'),{circularMotionHandles}=await import('/src/features/wedding/circularArm.js'),joint=(await import('/src/features/wedding/armCircle.json?import')).default;
  let maxLegError=0,maxAngleError=0;const lengths={};
  for(const id of ['walk','clap','jump','wave','bless','stretch','scratch','sway',...danceMoves.map(p=>p.id)])for(let i=0;i<=60;i++){
   const frame=characterMotion({gesture:id==='walk'?'':id,walking:id==='walk',gestureStarted:0},i/60*actionDuration(id),false);
   for(const side of [-1,1]){const key=side<0?'left':'right',r=rigidSide(frame.rigidPose,side,frame.rigidBindings),length=Math.hypot(r.ankle.x-r.hip.x,r.ankle.y-r.hip.y);lengths[key]??=length;maxLegError=Math.max(maxLegError,Math.abs(length-lengths[key]));const arm=side<0?frame.leftCircularArm:frame.circularArm;maxAngleError=Math.max(maxAngleError,-arm.bend,arm.bend-(arm.up?100:160),Math.abs(frame.rigidPose[key+'Shoe'])-5);}
  }
  function palms(t){const f=characterMotion({gesture:'clap',gestureStarted:0},t,false),out=[];for(const side of [-1,1]){const arm=side<0?f.leftCircularArm:f.circularArm,h=circularMotionHandles(f.rigidPose,f.rigidBindings,arm,side)[side<0?'leftElbow':'rightElbow'],u={x:(h.tip.x-h.pivot.x)/42,y:(h.tip.y-h.pivot.y)/42},det=side*(arm.up?-1:1),a=60.7498896*Math.PI/180,dx=153.520767-joint.x+13*Math.cos(a)+3*Math.sin(a),dy=119.964405-joint.y+13*Math.sin(a)-3*Math.cos(a);out.push({x:h.pivot.x+u.x*dx-det*u.y*dy,y:h.pivot.y+u.y*dx+det*u.x*dy});}return Math.hypot(out[1].x-out[0].x,out[1].y-out[0].y);}
  const idle=characterMotion({},0,false),clap=characterMotion({gesture:'clap'},.25,false);
  return {maxLegError,maxAngleError,idle:[idle.leftCircularArm.shoulder,idle.circularArm.shoulder],clapShoulders:[clap.leftCircularArm.shoulder,clap.circularArm.shoulder],closed:palms(.25),open:palms(.5),jump:[0,.825,1.8].map(t=>characterMotion({gesture:'jump'},t,false).lift),reduced:characterMotion({gesture:'jump'},.8,true).lift};
 });expect(result.maxLegError).toBeLessThan(1e-8);expect(result.maxAngleError).toBeLessThan(1e-8);expect(result.idle).toEqual([35,35]);expect(result.clapShoulders).toEqual([35,35]);expect(result.closed).toBeLessThan(55);expect(result.open).toBeGreaterThan(result.closed+8);expect(result.jump[0]).toBe(0);expect(result.jump[1]).toBeGreaterThan(75);expect(result.jump[2]).toBe(0);expect(result.reduced).toBe(0);
});
test('wedding page uses split rig and offers six dances and a jump',async({page,app})=>{
 app.admin=true;const missing=[];page.on('response',r=>{if(r.url().includes('/wedding/kenney_modular-characters/')&&r.status()>=400)missing.push(r.url());});await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toBeVisible();await expect(canvas).toHaveAttribute('data-motion-rig','original-svg-segments');
 await page.getByRole('button',{name:'更多舞步',exact:true}).click();await expect(page.locator('.motion-picker>div>button')).toHaveCount(10);await page.getByRole('button',{name:'复古舞步',exact:false}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-disco');
 await page.getByRole('button',{name:'↟ 跳跃',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','jump');await expect.poll(async()=>Number(await canvas.getAttribute('data-jump-height'))).toBeGreaterThan(50);await expect(canvas).toHaveAttribute('data-gesture','idle');expect(missing).toEqual([]);
});
test('emoji replaces only the visible head for five seconds while guests act independently',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toBeVisible();
 const original=await canvas.getAttribute('data-appearance');await page.getByRole('button',{name:'emoji',exact:true}).click();await page.getByRole('button',{name:'表达：飞吻',exact:true}).click();await expect(canvas).toHaveAttribute('data-temporary-head','emoji-kiss');
 await page.waitForTimeout(4100);await expect(canvas).toHaveAttribute('data-temporary-head','emoji-kiss');await expect(canvas).toHaveAttribute('data-appearance',original);await expect(page.locator('.wedding-emotions img')).toHaveCount(0);
 await expect(canvas).toHaveAttribute('data-temporary-head','',{timeout:2000});
 await expect.poll(async()=>{const people=JSON.parse(await canvas.getAttribute('data-people'));return new Set(people.map(p=>p.action+(p.walking?'-walk':''))).size;}).toBeGreaterThan(1);
 await page.screenshot({path:artifactPath('wedding-living-guests.png'),fullPage:true});
});
test('walking keeps elbows relaxed and motion poses render with their original SVG parts',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1440,height:1200});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const angles=await page.evaluate(async()=>{
  const {characterMotion,danceMoves}=await import('/src/features/wedding/motions.js'),{loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js');let maxElbow=0;
  for(let i=0;i<100;i++){const f=characterMotion({walking:true},i/10,false);maxElbow=Math.max(maxElbow,f.circularArm.bend,f.leftCircularArm.bend);}
  const art=await loadCharacters(),a=await art.ensureAppearance(makeAppearance()),canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1050;canvas.id='motion-gallery';canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#faf7f0';document.body.append(canvas);const c=canvas.getContext('2d');
  const actions=[{id:'idle',label:'自然垂手'},{id:'walk',label:'轻松走路'},{id:'clap',label:'A形鼓掌'},{id:'jump',label:'跳跃'},...danceMoves,{id:'stretch',label:'伸懒腰'},{id:'scratch',label:'抓抓屁股'}];
  for(let i=0;i<actions.length;i++){const move=actions[i],x=i%4*350,y=Math.floor(i/4)*350;c.save();c.translate(x+175,y+325);c.scale(2,2);art.draw(c,{x:0,y:0,appearance:a,direction:'front',walking:move.id==='walk',gesture:move.id==='walk'?'':move.id,gestureStarted:0},move.id==='jump'?.825:move.id==='clap'?1.25:1.1,false);c.restore();c.fillStyle='#62594f';c.font='17px sans-serif';c.fillText(move.label,x+90,y+25);}art.dispose();return {maxElbow};
 });expect(angles.maxElbow).toBeLessThanOrEqual(4);await page.locator('#motion-gallery').screenshot({path:artifactPath('wedding-motion-gallery.png')});await page.locator('#motion-gallery').evaluate(el=>el.remove());
});
