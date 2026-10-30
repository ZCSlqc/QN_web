import {test,expect} from '../fixtures/app.mjs';
import {artifactPath} from '../artifactPath.mjs';

test('dances stay under twenty seconds and preserve locked angles, rigid limbs and grounded feet',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion,danceMoves}=await import('/src/features/wedding/motions.js');
  const {circularHandFrame}=await import('/src/features/wedding/circularArm.js');
  const {upperPoint,defaultBasePose}=await import('/src/features/wedding/rigidRig.js');
  const {soleHeight}=await import('/src/features/wedding/grounding.js');
  const {normalizeReviewArm,reviewRange}=await import('/src/features/wedding/reviewPose.js');
  const {danceFrame}=await import('/src/features/wedding/choreography.js');
  let contactError=0,maxTravel=0,limitError=0;const counts=[],flossDepth=new Set();
  for(const move of danceMoves){let previous=null;const poses=new Set();
   for(let i=0;i<=Math.ceil(move.duration*120);i++){
    const t=Math.min(move.duration,i/120),f=characterMotion({gesture:move.id},t),palms=[];
    for(const side of [-1,1]){const a=side<0?f.leftCircularArm:f.circularArm,p=upperPoint(circularHandFrame(f.rigidPose,f.rigidBindings,a,side).palm,f.rigidPose,f.rigidBindings),range=reviewRange(side<0?'leftShoulder':'rightShoulder',{up:a.up}),raw=danceFrame(move.id,t)[side<0?'left':'right'];palms.push({x:p.x+f.bodyOffset.x,y:p.y+f.bodyOffset.y});limitError=Math.max(limitError,range.min-a.shoulder,a.shoulder-range.max,range.min-raw.shoulder,raw.shoulder-range.max);if(move.id==='dance-floss'){limitError=Math.max(limitError,Math.abs(a.bend));flossDepth.add(a.forearmLayers.front);}}
    for(const key of ['leftLeg','rightLeg']){const range=reviewRange(key,{legAxis:f.rigidBindings[key].axis});limitError=Math.max(limitError,f.rigidPose[key]-range.max,range.min-f.rigidPose[key]);}
    for(const key of ['leftShoe','rightShoe'])limitError=Math.max(limitError,Math.abs(f.rigidPose[key])-5);
    contactError=Math.max(contactError,Math.abs(soleHeight(f.rigidPose,f.rigidBindings)+f.bodyOffset.y-soleHeight(defaultBasePose)));
    if(previous)for(let k=0;k<2;k++)maxTravel=Math.max(maxTravel,Math.hypot(palms[k].x-previous[k].x,palms[k].y-previous[k].y));previous=palms;
    if(i%37===0)poses.add(JSON.stringify(palms.map(p=>[Math.round(p.x/10),Math.round(p.y/10)])));
   }
   const end=characterMotion({gesture:move.id},move.duration);counts.push({id:move.id,duration:move.duration,poses:poses.size,end:[end.leftCircularArm.shoulder,end.circularArm.shoulder,end.leftCircularArm.bend%360,end.circularArm.bend%360,end.bodyOffset.x,end.bodyOffset.y]});
  }
  return {counts,contactError,maxTravel,limitError,flossDepth:[...flossDepth],editorShoulder:normalizeReviewArm({shoulder:90},false,1).shoulder};
 });
 expect(result.counts).toHaveLength(8);for(const move of result.counts){expect(move.duration).toBeGreaterThanOrEqual(12);expect(move.duration).toBeLessThan(20);expect(move.poses,move.id).toBeGreaterThan(6);expect(move.end).toEqual([35,35,0,0,0,0]);}
 expect(result.contactError).toBeLessThan(1e-8);expect(result.limitError).toBeLessThan(1e-8);expect(result.maxTravel).toBeLessThan(18);expect(result.flossDepth.sort()).toEqual(['back','front']);expect(result.editorShoulder).toBe(45);
});

test('jump uses constant gravity, finite flight and continuous takeoff and recovery',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {jumpFrame,jumpPhysics,jumpFlightTime,jumpDuration}=await import('/src/features/wedding/jumpPhysics.js');
  const {characterMotion}=await import('/src/features/wedding/motions.js');
  const {soleHeight}=await import('/src/features/wedding/grounding.js');
  const {defaultBasePose}=await import('/src/features/wedding/rigidRig.js');
  const {gravity,launchSpeed,takeoff}=jumpPhysics,landing=takeoff+jumpFlightTime,dt=1e-4;
  let accelerationError=0,renderError=0,penetration=0,contactError=0,boundaryJump=0;
  for(let i=1;i<99;i++){const t=takeoff+jumpFlightTime*i/100,f=jumpFrame(t),render=characterMotion({gesture:'jump'},t),second=(jumpFrame(t+dt).height-2*f.height+jumpFrame(t-dt).height)/(dt*dt);accelerationError=Math.max(accelerationError,Math.abs(second+gravity));renderError=Math.max(renderError,Math.abs(render.lift-f.height));}
  for(let t=0;t<=jumpDuration;t+=.001){const f=characterMotion({gesture:'jump'},t),sole=soleHeight(f.rigidPose,f.rigidBindings)+f.bodyOffset.y-f.lift-soleHeight(defaultBasePose);penetration=Math.max(penetration,sole);if(!f.lift)contactError=Math.max(contactError,Math.abs(sole));}
  for(const t of [takeoff,landing,jumpDuration]){const a=jumpFrame(t-1e-6),b=jumpFrame(t+1e-6);for(const key of ['height','leg','shoe','shoulder','bend'])boundaryJump=Math.max(boundaryJump,Math.abs(a[key]-b[key]));}
  const apex=jumpFrame(takeoff+jumpFlightTime/2),end=characterMotion({gesture:'jump'},jumpDuration),reduced=characterMotion({gesture:'jump'},takeoff+jumpFlightTime/2,true);
  return {accelerationError,renderError,penetration,contactError,boundaryJump,apex,expectedApex:launchSpeed**2/(2*gravity),end:[end.lift,end.circularArm.shoulder,end.circularArm.bend,end.bodyOffset.y],reduced:[reduced.lift,reduced.bodyOffset.x,reduced.bodyOffset.y,reduced.rigidPose.leftLeg],before:jumpFrame(0).height,after:jumpFrame(jumpDuration+1).height};
 });
 expect(result.accelerationError).toBeLessThan(.001);expect(result.renderError).toBe(0);expect(result.penetration).toBeLessThan(1e-6);expect(result.contactError).toBeLessThan(1e-8);expect(result.boundaryJump).toBeLessThan(.002);expect(result.apex.velocity).toBeCloseTo(0,8);expect(result.apex.height).toBeCloseTo(result.expectedApex,8);expect(result.end).toEqual([0,35,0,0]);expect(result.reduced).toEqual([0,0,0,0]);expect(result.before).toBe(0);expect(result.after).toBe(0);
});

test('floss alternates front and rear sweeps while crab hands hang and small actions obey every joint limit',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion,actionDuration}=await import('/src/features/wedding/motions.js'),{reviewRange}=await import('/src/features/wedding/reviewPose.js'),{circularMotionHandles,circularHandFrame}=await import('/src/features/wedding/circularArm.js'),{upperPoint}=await import('/src/features/wedding/rigidRig.js');
  let maxError=0,minDrop=Infinity,maxTravel=0;const ends=[];
  for(const id of ['wave','stretch','scratch','sway','bless','clap','jump','dance-flash']){
   let previous=null,previousUp=null;for(let i=0;i<=Math.ceil(actionDuration(id)*120);i++){
    const t=Math.min(actionDuration(id),i/120),f=characterMotion({gesture:id},t),points=[];
    for(const side of [-1,1]){const prefix=side<0?'left':'right',a=side<0?f.leftCircularArm:f.circularArm,range=reviewRange(prefix+'Shoulder',{up:a.up}),p=upperPoint(circularHandFrame(f.rigidPose,f.rigidBindings,a,side).palm,f.rigidPose,f.rigidBindings);maxError=Math.max(maxError,range.min-a.shoulder,a.shoulder-range.max,-a.bend);points.push(p);
     if(id==='dance-flash'){const elbow=circularMotionHandles(f.rigidPose,f.rigidBindings,a,side)[prefix+'Elbow'].pivot;minDrop=Math.min(minDrop,p.y-elbow.y);}
    }
    if(previous&&previousUp===f.circularArm.up)for(let k=0;k<2;k++)maxTravel=Math.max(maxTravel,Math.hypot(points[k].x-previous[k].x,points[k].y-previous[k].y));previous=points;previousUp=f.circularArm.up;
   }
   const f=characterMotion({gesture:id},actionDuration(id));ends.push([f.leftCircularArm.shoulder,f.circularArm.shoulder,f.leftCircularArm.bend,f.circularArm.bend]);
  }
  const a=characterMotion({gesture:'dance-floss'},1.125),b=characterMotion({gesture:'dance-floss'},2.125);
  return {maxError,minDrop,maxTravel,ends,floss:{a:[a.leftCircularArm.forearmLayers,a.circularArm.forearmLayers],b:[b.leftCircularArm.forearmLayers,b.circularArm.forearmLayers],shoulderDifference:Math.abs(a.leftCircularArm.shoulder-b.leftCircularArm.shoulder)+Math.abs(a.circularArm.shoulder-b.circularArm.shoulder)}};
 });
 expect(result.maxError).toBeLessThan(1e-8);expect(result.minDrop).toBeGreaterThan(20);expect(result.maxTravel).toBeLessThan(18);for(const end of result.ends)expect(end).toEqual([35,35,0,0]);expect(result.floss.shoulderDifference).toBeLessThan(1e-8);
 expect(result.floss.a[0].front).toBe(result.floss.b[1].front);expect(result.floss.a[1].front).toBe(result.floss.b[0].front);expect(result.floss.a[0].front).not.toBe(result.floss.b[0].front);
});

test('dance continues beyond the old limit, shows countdown and can stop or change immediately',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-motion-rig','original-svg-segments');
 await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('tab',{name:'舞步'}).click();await expect(page.getByRole('button',{name:'海草舞',exact:false})).toHaveCount(0);await page.getByRole('button',{name:'💃 牙线舞 16秒'}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-floss');
 await page.waitForTimeout(6700);await expect(canvas).toHaveAttribute('data-gesture','dance-floss');await expect(page.locator('.wedding-toolbar>small')).toContainText('牙线舞');await expect(page.locator('.wedding-toolbar>small')).not.toContainText('16 秒');
 await page.getByRole('button',{name:'⏹ 收舞',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','idle');await expect(page.getByRole('button',{name:'💃 舞蹈',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('button',{name:'💃 闪身步 17秒'}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-flash');await expect(canvas).toHaveAttribute('data-gesture','idle',{timeout:19000});await page.getByRole('button',{name:'💃 舞蹈',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-waltz');await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('tab',{name:'日常'}).click();await page.getByRole('button',{name:'🐇 开心小跳',exact:false}).click();await expect(canvas).toHaveAttribute('data-gesture','jump');await expect(canvas).toHaveAttribute('data-gesture','idle');expect(app.wardrobeWrites).toBe(0);
});

test('a new action requested in the air waits for the jump to land',async({page,app})=>{
 app.admin=true;await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-motion-rig','original-svg-segments');
 await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('button',{name:'🐇 开心小跳',exact:false}).click();
 await expect.poll(async()=>Number(await canvas.getAttribute('data-jump-height')),{intervals:[20,40]}).toBeGreaterThan(35);
 await page.getByRole('button',{name:'👏 鼓掌',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','jump');await expect(canvas).toHaveAttribute('data-gesture','clap');await expect(canvas).toHaveAttribute('data-jump-height','0.0');
});

test('new dances and jump render as a full choreography contact sheet',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js'),{danceMoves}=await import('/src/features/wedding/motions.js');
  const art=await loadCharacters(),appearance=await art.ensureAppearance({...makeAppearance(1),sleeve:'long'}),canvas=document.createElement('canvas');canvas.id='dance-contact-sheet';canvas.width=1600;canvas.height=(danceMoves.length+1)*290;canvas.style.cssText='position:absolute;inset:0;z-index:99999';document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.fillStyle='#f6f0e7';ctx.fillRect(0,0,canvas.width,canvas.height);
  const rows=[...danceMoves,{id:'jump',label:'跳跃',times:[0,.16,.32,.44,.556,.67,.793,1.133]}];
  for(let row=0;row<rows.length;row++)for(let col=0;col<8;col++){
   const move=rows[row],time=move.times?.[col]??(.9+col*(move.duration-1.8)/7),x=col*200,y=row*290;
   ctx.strokeStyle='#ddcfbc';ctx.beginPath();ctx.moveTo(x,y+263);ctx.lineTo(x+200,y+263);ctx.stroke();ctx.save();ctx.translate(x+100,y+250);ctx.scale(1.35,1.35);art.draw(ctx,{x:0,y:0,appearance,direction:'front',gesture:move.id},time,false);ctx.restore();ctx.fillStyle='#554b42';ctx.font='15px sans-serif';ctx.fillText(`${move.label} · ${time.toFixed(2)}s`,x+10,y+24);
  }art.dispose();
 });
 await page.locator('#dance-contact-sheet').screenshot({path:artifactPath('wedding-dance-contact-sheet.png')});
});
