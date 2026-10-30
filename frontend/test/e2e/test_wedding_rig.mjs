import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';
import fs from 'node:fs/promises';

async function select(page,key,value){await page.getByLabel('选中部件',{exact:true}).selectOption(key);if(value!==undefined)await page.getByLabel('旋转角度',{exact:true}).fill(String(value));}
async function ready(page,app){app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();}
test('right shoulder rests at three with both anchors and elbows follow shoulder mode',async({page,app})=>{
 await ready(page,app);await select(page,'rightShoulder');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('3');
 const calibrated=await page.evaluate(async()=>{
   const {circularMotionHandles}=await import('/src/features/wedding/circularArm.js'),{defaultBasePose,defaultBindings,rigidSide}=await import('/src/features/wedding/rigidRig.js'),{normalizeReviewArm}=await import('/src/features/wedding/reviewPose.js');
   const arm=normalizeReviewArm({shoulder:3}),again=normalizeReviewArm(arm),h=circularMotionHandles(defaultBasePose,defaultBindings,arm),a=h.rightShoulderUpper.pivot,b=h.rightShoulderLower.pivot,r=rigidSide(defaultBasePose,1,defaultBindings);
   return {again:again.shoulder,physicalRotation:(Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(82.05,16.2)-r.armAngle)*180/Math.PI};
 });expect(calibrated.again).toBe(3);expect(calibrated.physicalRotation).toBeCloseTo(3,8);
 await expect(page.locator('[data-motion="rightShoulderUpper"]')).toBeVisible();await expect(page.locator('[data-motion="rightShoulderLower"]')).toBeVisible();
 await select(page,'rightShoulder',5);await expect(page.locator('[data-motion="rightShoulderLower"]')).toHaveCount(0);
 await page.getByRole('button',{name:'归位到 3°',exact:true}).click();await expect(page.locator('[data-motion="rightShoulderLower"]')).toBeVisible();
 await select(page,'rightElbow',200);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('200');
 await select(page,'rightShoulder');await page.getByRole('button',{name:'下点 · 上举',exact:true}).click();await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('3');
 await select(page,'rightElbow',200);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('200');
 await select(page,'leftShoulder');await page.getByRole('button',{name:'下点 · 上举',exact:true}).click();await select(page,'leftElbow',200);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('200');
 await page.getByRole('button',{name:'保存到本机',exact:true}).click();await page.reload();await expect(page.locator('.stage image')).toBeVisible();await select(page,'rightShoulder');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('3');
});
test('review page removes binding workflows and enforces new movement limits',async({page,app})=>{
 await ready(page,app);await expect(page.getByRole('heading',{name:'人物动作核验'})).toBeVisible();
 await expect(page.getByRole('button',{name:/确定姿态|重新调整姿态|重新绑定点位/})).toHaveCount(0);await expect(page.locator('[data-binding]')).toHaveCount(0);
 await select(page,'head',95);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('20');await select(page,'head',-95);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('-20');
 for(const side of ['left','right']){
  await select(page,side+'Shoulder');await page.getByRole('button',{name:'下点 · 上举',exact:true}).click();await select(page,side+'Shoulder',60);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue(side==='right'?'13':'10');
  await page.getByRole('button',{name:'上点 · 下摆',exact:true}).click();await select(page,side+'Shoulder',60);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue(side==='right'?'45':'35');
  for(const [key,min,max] of [[side+'Leg',-11,9],[side+'Shoe',-5,5]]){await select(page,key,-95);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue(String(min));await select(page,key,95);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue(String(max));}
 }
 await page.getByRole('button',{name:'恢复初始姿态',exact:true}).click();await page.screenshot({path:artifactPath('review-page-desktop.png'),fullPage:true});
});
test('unlock opens other movable joints while cumulative elbows survive restoring limits',async({page,app})=>{
 await ready(page,app);await select(page,'rightElbow',1080);await page.getByRole('button',{name:'解放旋转角度',exact:true}).click();
 for(const key of ['head','leftShoulder','rightShoulder','waist','leftLeg','rightLeg','leftShoe','rightShoe']){await select(page,key,120);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('120');}
 await expect(page.locator('[data-point$="Hand"]')).toHaveCount(0);await page.getByRole('button',{name:'恢复角度限制',exact:true}).click();
 for(const [key,value] of [['head',20],['rightShoulder',45],['leftShoulder',35],['waist',10],['leftLeg',9],['rightShoe',5],['rightElbow',1080]]){await select(page,key);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue(String(value));}
});
test('elbow pointer drag accumulates full turns for both arms',async({page,app})=>{
 await ready(page,app);await page.getByRole('button',{name:'恢复初始姿态',exact:true}).click();
 for(const side of ['left','right']){
  const h=page.locator(`[data-motion="${side}Elbow"]`),geo=await h.evaluate(el=>{const p=el.parentElement.querySelector('[data-motion-root]'),m=el.getScreenCTM(),center=new DOMPoint(+p.getAttribute('cx'),+p.getAttribute('cy')).matrixTransform(m),tip=new DOMPoint(+el.getAttribute('cx'),+el.getAttribute('cy')).matrixTransform(m);return {x:center.x,y:center.y,dx:tip.x-center.x,dy:tip.y-center.y};});
  await page.mouse.move(geo.x+geo.dx,geo.y+geo.dy);await page.mouse.down();
  for(let i=1;i<=48;i++){const a=(side==='left'?-1:1)*i*Math.PI/12;await page.mouse.move(geo.x+geo.dx*Math.cos(a)-geo.dy*Math.sin(a),geo.y+geo.dx*Math.sin(a)+geo.dy*Math.cos(a));}
  await page.mouse.up();await select(page,side+'Elbow');expect(Number(await page.getByLabel('旋转角度',{exact:true}).inputValue())).toBeCloseTo(720,0);
 }
 await page.getByRole('button',{name:'保存到本机',exact:true}).click();await page.reload();await expect(page.locator('.stage image')).toBeVisible();await select(page,'leftElbow');expect(Number(await page.getByLabel('旋转角度',{exact:true}).inputValue())).toBeCloseTo(720,0);
});
test('waist anchor opens again at zero and lower body stays fixed',async({page,app})=>{
 await ready(page,app);const leg=await page.locator('[data-point-root="rightLeg"]').evaluate(el=>[el.getAttribute('cx'),el.getAttribute('cy')]);
 await page.locator('[data-motion="waistLeft"]').press('ArrowRight');await expect(page.locator('[data-motion="waistRight"]')).toHaveCount(0);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('1');
 expect(await page.locator('[data-point-root="rightLeg"]').evaluate(el=>[el.getAttribute('cx'),el.getAttribute('cy')])).toEqual(leg);
 await page.getByRole('button',{name:'当前归零',exact:true}).click();await expect(page.locator('[data-motion="waistRight"]')).toBeVisible();
 await page.locator('[data-motion="waistRight"]').press('ArrowLeft');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('-1');await expect(page.locator('[data-motion="waistLeft"]')).toHaveCount(0);
});
test('clothes, continuous turns and free mode survive save export and import',async({page,app})=>{
 await ready(page,app);await page.getByRole('button',{name:'解放旋转角度',exact:true}).click();await select(page,'leftElbow',-810);await select(page,'rightElbow',990);await select(page,'head',80);
 await page.getByRole('button',{name:'穿搭',exact:true}).click();await page.getByText('短袖',{exact:true}).click();await page.getByText('短裤',{exact:true}).click();await page.getByRole('button',{name:'背面',exact:true}).click();await page.getByRole('button',{name:'保存到本机',exact:true}).click();await page.reload();await expect(page.locator('.stage image')).toBeVisible();
 await expect(page.getByRole('button',{name:'恢复角度限制',exact:true})).toBeVisible();await select(page,'leftElbow');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('-810');
 await page.getByRole('button',{name:'穿搭',exact:true}).click();await expect(page.getByRole('radio',{name:'短袖',exact:true})).toBeChecked();await expect(page.getByRole('radio',{name:'短裤',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'保存',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出配置 JSON',exact:true}).click();const file=await(await pending).path(),data=JSON.parse(await fs.readFile(file,'utf8'));expect(data.circularArm.bend).toBe(990);expect(data.freeRotation).toBe(true);
 await page.getByRole('button',{name:'恢复初始姿态',exact:true}).click();await page.getByLabel('导入配置',{exact:true}).setInputFiles(file);await page.getByRole('button',{name:'动作',exact:true}).click();await select(page,'rightElbow');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('990');
});
test('mobile review has no horizontal overflow and all tools remain usable',async({page,app})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,app);await select(page,'leftElbow',140);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('140');
 await page.getByRole('button',{name:'穿搭',exact:true}).click();await page.getByText('无袖',{exact:true}).click();await page.getByText('无裤腿',{exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:artifactPath('review-page-mobile.png'),fullPage:true});
});
test('upper body drops two pixels and head drops four without moving lower body',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {normalizePose,normalizeBindings,rigidHandles,rigidSide,bindingFromWorld}=await import('/src/features/wedding/rigidRig.js');
  const b=normalizeBindings(),p=normalizePose(),h=rigidHandles(p,b),r=rigidSide(p,1,b);
  const rotated=rigidHandles(normalizePose({waist:10}),b);
  const restored=bindingFromWorld('rightArm',rotated.rightArm.pivot,normalizePose({waist:10}),b);
  return {armDrop:h.rightArm.pivot.y-b.rightArm.y,headDrop:h.head.pivot.y-b.head.y,hip:h.rightLeg.pivot,modelHip:r.hip,restored,original:{x:b.rightArm.x,y:b.rightArm.y}};
 });
 expect(result.armDrop).toBeCloseTo(2);expect(result.headDrop).toBeCloseTo(4);expect(result.hip).toEqual(result.modelHip);
 expect(result.restored.x).toBeCloseTo(result.original.x);expect(result.restored.y).toBeCloseTo(result.original.y);
});
