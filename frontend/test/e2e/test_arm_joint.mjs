import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';
import fs from 'node:fs';
async function openLab(page){await page.getByRole('button',{name:'\u4fdd\u5b58',exact:true}).click();await page.getByText('\u8f6e\u5ed3\u68c0\u67e5\uff08\u9ad8\u7ea7\uff09',{exact:true}).click();await page.getByRole('button',{name:'\u53f3\u81c2\u5706\u5f62\u94f0\u63a5\u793a\u4f8b',exact:true}).click();}
const joint=JSON.parse(fs.readFileSync(new URL('../../src/features/wedding/armCircle.json',import.meta.url),'utf8'));
test('separate skin and sleeve circles are tangent to source contours with collinear cut diameters',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1680,height:1400});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 await openLab(page);
 await page.getByLabel('\u900f\u89c6\u8863\u8896',{exact:true}).check();
 const geometry=await page.locator('.arm-lab svg').evaluate((svg,joint)=>{
   const group=svg.querySelector('[data-whole-arm]'),inverse=group.getCTM().inverse();
   function distanceTo(selector,center){return Math.min(...[...svg.querySelectorAll(selector)].map(path=>{
     const matrix=inverse.multiply(path.getCTM()),length=path.getTotalLength();let distance=Infinity;
     for(let i=0;i<=4096;i++){const p=path.getPointAtLength(length*i/4096).matrixTransform(matrix);distance=Math.min(distance,Math.hypot(p.x-center.x,p.y-center.y));}return distance;
   }));}
   const direction=joint.diameterLine.direction,origin=joint.diameterLine.point;
   return {skinDistance:distanceTo('[data-upper-skin] path',joint.skin),sleeveDistance:distanceTo('[data-upper-sleeve] path',joint.sleeve),
     lineError:Math.max(...[...joint.skin.diameter,...joint.sleeve.diameter].map(p=>Math.abs((p.x-origin.x)*direction.y-(p.y-origin.y)*direction.x))),
     separation:Math.hypot(joint.skin.x-joint.sleeve.x,joint.skin.y-joint.sleeve.y)};
 },joint);
 expect(geometry.lineError).toBeLessThan(1e-8);expect(geometry.separation).toBeGreaterThan(1);
 expect(joint.sleeve.radius).toBeGreaterThan(joint.skin.radius+geometry.separation);
 expect(Math.abs(geometry.skinDistance-joint.skin.radius)).toBeLessThan(.02);
 expect(Math.abs(geometry.sleeveDistance-joint.sleeve.radius)).toBeLessThan(.02);
 await page.locator('.arm-lab').screenshot({path:artifactPath('arm-two-circles.png')});
 const orders=await page.evaluate(async()=>{
   const {loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js'),{defaultBasePose,defaultBindings}=await import('/src/features/wedding/rigidRig.js');
   const art=await loadCharacters(),a=await art.ensureAppearance({...makeAppearance(),sleeve:'long'}),canvas=document.createElement('canvas');
   canvas.width=1680;canvas.height=1080;canvas.id='sleeve-joint-review';canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#fffdf8;';document.body.append(canvas);
   const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),orders=[];let calls=[];
   c.drawImage=(im,...args)=>{calls.push(im.src||(im.width===153&&im.height===174?'shirt-back':'cache'));draw(im,...args);};
   for(let row=0;row<2;row++)for(let i=0;i<4;i++){
     calls=[];c.save();c.translate(210+i*420,505+row*540);c.scale(3.1,3.1);
     const up=i===1||i===2,arm={enabled:true,up,shoulder:up?6:0,bend:[0,60,100,160][i]};
     art.draw(c,{x:0,y:0,appearance:a,direction:row?'back':'front',rigidPose:defaultBasePose,rigidBindings:defaultBindings,circularArm:arm,leftCircularArm:arm},0,true);c.restore();
     orders.push({sleeve:calls.findIndex(s=>s.endsWith('blueArm_long.png')||s.endsWith('sleeve-blue-upper.svg')),neck:calls.findIndex(s=>s.endsWith('tint1_neck.png')),shirt:calls.findIndex(s=>s.endsWith('blueShirt5.png')||s==='shirt-back')});
     c.fillStyle='#62564c';c.font='18px sans-serif';c.fillText(`${row?'Back':'Front'} / ${arm.bend}°`,25+i*420,35+row*540);
   }art.dispose();return orders;
 });
 for(const order of orders){expect(order.sleeve).toBeGreaterThanOrEqual(0);expect(order.neck).toBeGreaterThan(order.sleeve);expect(order.shirt).toBeGreaterThan(order.neck);}
 await page.locator('#sleeve-joint-review').screenshot({path:artifactPath('rig-sleeve-circle-review.png')});
 await page.locator('#sleeve-joint-review').evaluate(el=>el.remove());
});
test('whole arm reflection swaps shoulder corners across their perpendicular bisector',async({page,app},testInfo)=>{
 app.admin=true;await page.goto('/wedding/rig');await openLab(page);
 await page.getByLabel('示例弯曲角度',{exact:true}).fill('6');
 await page.locator('.arm-lab').screenshot({path:artifactPath('arm-mirror-before.png')});
 await page.getByLabel('肩部铰接方式',{exact:true}).selectOption('up');
 await expect(page.getByLabel('示例弯曲角度',{exact:true})).toHaveValue('0');
 await page.getByLabel('示例肩部角度',{exact:true}).fill('6');
 const result=await page.locator('[data-whole-arm]').evaluate(el=>{
   const m=el.transform.baseVal.consolidate().matrix,p=new DOMPoint((285.75-278.07663)*3-1.77,(52.7-25.35)*3),top=new DOMPoint((280.35-278.07663)*3-1.77,0),q=p.matrixTransform(m),other=top.matrixTransform(m),mid=new DOMPoint((p.x+top.x)/2,(p.y+top.y)/2),reflectedMid=mid.matrixTransform(m);
   return {error:Math.max(Math.hypot(top.x-q.x,top.y-q.y),Math.hypot(p.x-other.x,p.y-other.y),Math.hypot(mid.x-reflectedMid.x,mid.y-reflectedMid.y)),det:m.a*m.d-m.b*m.c,parts:['[data-upper-sleeve]','[data-lower-arm]','[data-lower-sleeve]','[data-hand]'].every(s=>el.querySelector(s))};
 });
 expect(result.error).toBeLessThan(.0001);expect(result.det).toBeCloseTo(-1);expect(result.parts).toBe(true);
 const fixed=await page.locator('[data-shoulder-motion]').evaluate(el=>{const p=new DOMPoint((285.75-278.07663)*3-1.77,(52.7-25.35)*3);const m=el.transform.baseVal.consolidate().matrix.multiply(el.querySelector('[data-whole-arm]').transform.baseVal.consolidate().matrix);const q=new DOMPoint((280.35-278.07663)*3-1.77,0).matrixTransform(m);return Math.hypot(q.x-p.x,q.y-p.y);});expect(fixed).toBeLessThan(.0001);
 await page.locator('.arm-lab').screenshot({path:artifactPath('arm-mirror-after.png')});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前 SVG',exact:true}).first().click();await(await download).saveAs(artifactPath('arm-mirror-example.svg'));
});
test('skin and long sleeve rotate about their own centers at the same angle',async({page,app},testInfo)=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 await openLab(page);
 const svg=page.getByLabel('右臂圆形铰接示例',{exact:true});await expect(svg).toBeVisible();
 await page.getByLabel('示例弯曲角度',{exact:true}).fill('110');
 await expect(svg.locator('[data-lower-arm]')).toHaveAttribute('transform',`rotate(110 ${joint.x} ${joint.y})`);
 const sleeveRotation=await svg.locator('[data-lower-sleeve]').getAttribute('transform');
 const skinRotation=await svg.locator('[data-lower-arm]').getAttribute('transform');
 expect(sleeveRotation).not.toBe(skinRotation);
 const rotation=await svg.evaluate(el=>{
   return ['[data-lower-arm]','[data-lower-sleeve]'].map(selector=>{const group=el.querySelector(selector),circle=selector==='[data-lower-arm]'?el.querySelector('[data-joint-circle="skin"]'):group.querySelector('circle'),p=new DOMPoint(+circle.getAttribute('cx'),+circle.getAttribute('cy')),m=group.transform.baseVal.consolidate().matrix,q=p.matrixTransform(m);return {fixed:Math.hypot(p.x-q.x,p.y-q.y),angle:Math.atan2(m.b,m.a)*180/Math.PI,det:m.a*m.d-m.b*m.c};});
 });
 for(const part of rotation){expect(part.fixed).toBeLessThan(1e-4);expect(part.angle).toBeCloseTo(110);expect(part.det).toBeCloseTo(1);}
 await page.getByLabel('示例圆心 X',{exact:true}).fill('110');
 await expect(svg.locator('[data-upper-skin]')).toHaveCount(0);
 await expect(svg.locator('[data-lower-arm]>circle')).toHaveCount(0);
 expect(+(await svg.locator('[data-lower-sleeve]>circle').getAttribute('cx'))).toBeCloseTo(110+joint.sleeve.x-joint.skin.x,8);
 await page.locator('.arm-lab').screenshot({path:testInfo.outputPath('right-arm-example.png')});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前 SVG',exact:true}).first().click();await(await download).saveAs(testInfo.outputPath('right-arm.svg'));
 expect(await svg.locator('image').count()).toBe(0);
 await page.getByLabel('显示长袖',{exact:true}).uncheck();await expect(svg.locator('[data-lower-sleeve]')).toHaveCount(0);
});
