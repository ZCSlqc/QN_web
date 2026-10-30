import {test,expect} from '../fixtures/app.mjs';
test('calibrated defaults preserve attachment hierarchy and layering',async({page,app},testInfo)=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 await expect(page.getByRole('button',{name:'解放旋转角度',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'重新绑定点位',exact:true})).toHaveCount(0);
 const result=await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js');
  const {defaultBindings,defaultBasePose,normalizeBindings,fixedHandAngle,rigidSide,fromPart}=await import('/src/features/wedding/rigidRig.js');
  const {makeAppearance}=await import('/src/features/wedding/catalog.js');
  const art=await loadCharacters(),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=700;canvas.id='calibration-proof';canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#efe7dc';document.body.append(canvas);
  const c=canvas.getContext('2d'),calls=[],original=c.drawImage.bind(c);
  c.drawImage=(im,...args)=>{calls.push(im.src||im.dataset?.rigLayer||'cache');original(im,...args);};
  for(let row=0;row<2;row++)for(let i=0;i<3;i++){
    const a=await art.ensureAppearance({...makeAppearance(),sleeve:['long','short','shorter'][i],leg:i===2?'shorter':'long'});
    c.save();c.translate(200+i*400,325+row*340);c.scale(2,2);art.draw(c,{x:0,y:0,appearance:a,direction:row?'back':'front',rigidPose:defaultBasePose,rigidBindings:defaultBindings},0,true);c.restore();
  }
  const index=(suffix)=>calls.findIndex(s=>s.endsWith(suffix));
  const order={body:index('blueShirt5.png'),waist:index('pantsNavy3.png'),skin:index('tint1_leg.png'),shoe:index('blackShoe1.png'),pants:index('pantsNavy_long.png'),hand:calls.findLastIndex(s=>s.endsWith('tint1_hand.png')),sleeve:index('sleeve-blue-upper.svg')};
  const corners=[];
  for(const side of [-1,1])for(const angle of [-30,0,30]){
    const pose={...defaultBasePose,[side<0?'leftLeg':'rightLeg']:angle};
    const r=rigidSide(pose,side,defaultBindings);
    const corner=fromPart(r.hip,r.leg,{x:r.leg.sx,y:r.leg.sy},r.localLegAngle,side);
    corners.push(Math.hypot(corner.x-r.hip.x,corner.y-r.hip.y));
  }
  const attachment=(await import('/src/features/wedding/armAttachment.json?import')).default;
  const r=rigidSide(defaultBasePose,1,defaultBindings);
  const handMid=fromPart(r.wrist,{sx:r.hand.sx,sy:r.hand.sy},attachment.handPivot,r.armAngle+fixedHandAngle*Math.PI/180,1);
  const shoulder=fromPart(r.shoulder,r.arm,attachment.armTop,r.armAngle,1);
  const wristMid=fromPart(r.shoulder,r.arm,attachment.wrist,r.armAngle,1);
  const armEdge=attachment.armEnd.map(p=>fromPart(r.shoulder,r.arm,p,r.armAngle,1));
  const handEdge=attachment.handEdge.map(p=>fromPart(r.wrist,{sx:r.hand.sx,sy:r.hand.sy},p,r.armAngle+fixedHandAngle*Math.PI/180,1));
  const av={x:armEdge[1].x-armEdge[0].x,y:armEdge[1].y-armEdge[0].y},hv={x:handEdge[1].x-handEdge[0].x,y:handEdge[1].y-handEdge[0].y};
  const parallelError=Math.abs(av.x*hv.y-av.y*hv.x)/(Math.hypot(av.x,av.y)*Math.hypot(hv.x,hv.y));
  const locked=normalizeBindings({neck:{x:90},waist:{x:90},rightHand:{sx:90}});
  art.dispose();return {order,bindings:defaultBindings,locked,pose:defaultBasePose,corners,handAngle:fixedHandAngle,parallelError,errors:[Math.hypot(handMid.x-wristMid.x,handMid.y-wristMid.y),Math.hypot(shoulder.x-r.shoulder.x,shoulder.y-r.shoulder.y)]};
 });
 expect(result.order.skin).toBeLessThan(result.order.shoe);expect(result.order.shoe).toBeLessThan(result.order.pants);expect(result.order.body).toBeLessThan(result.order.hand);expect(result.order.sleeve).toBeLessThan(result.order.hand);
 expect(result.pose.rightArm).toBe(-44);expect(result.pose.rightHand).toBe(0);
 expect(result.order.waist).toBeGreaterThan(result.order.body);
 expect(Math.max(...result.errors)).toBeLessThan(1e-8);
 expect(result.parallelError).toBeLessThan(1e-10);
 expect(result.bindings.rightLeg.x+result.bindings.leftLeg.x).toBeCloseTo(153);
 expect(result.bindings.rightLeg.x).toBeCloseTo(153,3);
 expect(Math.max(...result.corners)).toBeLessThan(1e-8);
 await page.locator('#calibration-proof').screenshot({path:testInfo.outputPath('calibrated-defaults.png')});await page.locator('#calibration-proof').evaluate(el=>el.remove());
 expect(result.locked.neck).toEqual(result.bindings.neck);
 expect(result.locked.waist).toEqual({...result.bindings.waist,axis:0});
 await page.getByLabel('选中部件',{exact:true}).selectOption('rightLeg');
 await expect(page.getByLabel('旋转角度',{exact:true})).toBeVisible();
});
