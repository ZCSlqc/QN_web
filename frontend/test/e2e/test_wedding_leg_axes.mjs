import {test,expect} from '../fixtures/app.mjs';
import {artifactPath} from '../artifactPath.mjs';
async function ready(page,app){app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();}
async function select(page,key,value){await page.getByLabel('选中部件',{exact:true}).selectOption(key);if(value!==undefined)await page.getByLabel('旋转角度',{exact:true}).fill(String(value));}

test('pants inner SVG vertex stays fixed through the full twenty six degree rigid leg rotation',async({page,app})=>{
 await ready(page,app);const result=await page.evaluate(async()=>{
  const {rigidSide,normalizeBindings,defaultBasePose,fromPart}=await import('/src/features/wedding/rigidRig.js'),attachment=(await import('/src/features/wedding/legAttachment.json?import')).default;
  let switchError=0,pinError=0,lengthError=0,angleError=0;
  for(const side of [-1,1])for(const style of ['long','shorter']){
   const key=side<0?'leftLeg':'rightLeg',b=normalizeBindings();b[key].pivotStyle=style;
   const p={...defaultBasePose,[key]:-11},before=rigidSide(p,side,b);b[key].axis='inner';const after=rigidSide(p,side,b),length=Math.hypot(after.ankle.x-after.hip.x,after.ankle.y-after.hip.y);
   for(const field of ['hip','ankle','legInner'])switchError=Math.max(switchError,Math.hypot(before[field].x-after[field].x,before[field].y-after[field].y));
   for(let additional=0;additional<=26;additional++){
    const r=rigidSide({...p,[key]:-11-additional},side,b),v=attachment.pantsInner[style],a=attachment.pants[style],tip=fromPart(r.hip,{sx:a.x,sy:a.y},v,r.localLegAngle-3*Math.PI/180,side);
    pinError=Math.max(pinError,Math.hypot(tip.x-before.legInner.x,tip.y-before.legInner.y));lengthError=Math.max(lengthError,Math.abs(Math.hypot(r.ankle.x-r.hip.x,r.ankle.y-r.hip.y)-length));angleError=Math.max(angleError,Math.abs((r.localLegAngle-after.localLegAngle)*180/Math.PI+additional));
   }
  }return {switchError,pinError,lengthError,angleError};
 });for(const value of Object.values(result))expect(value).toBeLessThan(1e-8);
});

test('leg inner axis opens only at outer stop, clamps to twenty six and survives reload and reversing',async({page,app})=>{
 await ready(page,app);await select(page,'rightLeg');await expect(page.getByRole('button',{name:'内侧点',exact:true})).toBeDisabled();
 await select(page,'rightLeg',-11);const before=await page.locator('[data-point-root="rightShoe"]').evaluate(el=>[+el.getAttribute('cx'),+el.getAttribute('cy')]);
 await page.getByRole('button',{name:'内侧点',exact:true}).click();await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('0');const after=await page.locator('[data-point-root="rightShoe"]').evaluate(el=>[+el.getAttribute('cx'),+el.getAttribute('cy')]);for(let i=0;i<2;i++)expect(after[i]).toBeCloseTo(before[i],10);
 const pin=await page.locator('[data-leg-axis="rightLeg-inner"]').evaluate(el=>[+el.getAttribute('cx'),+el.getAttribute('cy')]);await select(page,'rightLeg',90);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('26');await expect(page.getByRole('button',{name:'外侧点',exact:true})).toBeDisabled();
 expect(await page.locator('[data-leg-axis="rightLeg-inner"]').evaluate(el=>[+el.getAttribute('cx'),+el.getAttribute('cy')])).toEqual(pin);
 await select(page,'rightElbow',1080);await page.getByRole('button',{name:'保存到本机',exact:true}).click();await page.reload();await expect(page.locator('.stage image')).toBeVisible();await select(page,'rightLeg');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('26');await select(page,'rightElbow');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('1080');
 await select(page,'rightLeg');await page.getByRole('button',{name:'回到换轴位置',exact:true}).click();await page.getByRole('button',{name:'外侧点',exact:true}).click();await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('-11');await page.getByRole('button',{name:'当前归零',exact:true}).click();await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('0');
});

test('leg axes link only when requested and front and rear outfits keep the pivot',async({page,app})=>{
 await ready(page,app);await page.getByLabel('左右联动').check();await select(page,'leftLeg',-11);await page.getByRole('button',{name:'内侧点',exact:true}).click();await select(page,'leftLeg',15);await select(page,'rightLeg');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('15');
 await page.getByRole('button',{name:'背面',exact:true}).click();await page.getByRole('button',{name:'穿搭',exact:true}).click();await page.getByText('短裤',{exact:true}).click();await expect(page.locator('.stage image')).toBeVisible();
 await page.getByRole('button',{name:'动作',exact:true}).click();await select(page,'rightLeg');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('15');await page.getByLabel('左右联动').uncheck();await select(page,'leftLeg',26);await select(page,'rightLeg');await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('15');
 await page.screenshot({path:artifactPath('wedding-leg-inner-axis.png'),fullPage:true});
});
