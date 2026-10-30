import {test,expect} from '../fixtures/app.mjs';
import {artifactPath} from '../artifactPath.mjs';
async function ready(page,app){app.admin=true;await page.goto('/wedding');await expect(page.locator('.wedding-canvas canvas')).toBeVisible();}
async function dances(page){await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('tab',{name:'舞步'}).click();}

test('eight daily actions and eight dances split four and four; stars persist without changing on previews',async({page,app})=>{
 await ready(page,app);const canvas=page.locator('.wedding-canvas canvas');await page.getByRole('button',{name:'动作',exact:true}).click();await expect(page.locator('.motion-options>button')).toHaveCount(8);await expect(page.locator('.motion-groups section')).toHaveCount(2);
 await page.getByRole('tab',{name:'舞步'}).click();await expect(page.locator('.dance-card')).toHaveCount(8);for(const section of await page.locator('.motion-groups section').all())await expect(section.locator('.dance-card')).toHaveCount(4);
 await expect(page.getByRole('button',{name:'设婚礼圆舞为默认',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:/螃蟹舞|小鸡舞|海草舞/})).toHaveCount(0);
 await page.getByRole('button',{name:/^💃 闪身步/}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-flash');await dances(page);await expect(page.getByRole('button',{name:'设婚礼圆舞为默认',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'设科目三为默认',exact:true}).click();await page.reload();await expect(canvas).toBeVisible();await page.getByRole('button',{name:'💃 舞蹈',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-kemusan');expect(app.wardrobeWrites).toBe(0);
});

test('chaos dance heads follow phrases, manual emoji wins, formal dance and stopping restore the original head',async({page,app})=>{
 await ready(page,app);const canvas=page.locator('.wedding-canvas canvas'),appearance=await canvas.getAttribute('data-appearance');await dances(page);await page.getByRole('button',{name:/^💃 闪身步/}).click();await expect(canvas).toHaveAttribute('data-dance-head',/^emoji-/);const first=await canvas.getAttribute('data-dance-head');await expect.poll(()=>canvas.getAttribute('data-dance-head')).not.toBe(first);
 await page.getByRole('button',{name:'emoji',exact:true}).click();await page.getByRole('button',{name:'表达：飞吻',exact:true}).click();await expect(canvas).toHaveAttribute('data-temporary-head','emoji-kiss');await expect(canvas).toHaveAttribute('data-dance-head','');await expect(canvas).toHaveAttribute('data-appearance',appearance);
 await page.getByRole('button',{name:'⏹ 收舞',exact:true}).click();await expect(canvas).toHaveAttribute('data-dance-head','');await expect(canvas).toHaveAttribute('data-temporary-head','emoji-kiss');await expect(canvas).toHaveAttribute('data-temporary-head','',{timeout:6000});
 await page.getByRole('button',{name:'💃 舞蹈',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','dance-waltz');await expect(canvas).toHaveAttribute('data-dance-head','');await page.getByRole('button',{name:'⏹ 收舞',exact:true}).click();await dances(page);await page.getByLabel('鬼畜舞自动变脸').uncheck();await page.getByRole('button',{name:/^💃 牙线舞/}).click();await page.waitForTimeout(700);await expect(canvas).toHaveAttribute('data-dance-head','');await page.reload();await expect(canvas).toBeVisible();await dances(page);await expect(page.getByLabel('鬼畜舞自动变脸')).not.toBeChecked();
 await page.screenshot({path:artifactPath('wedding-eight-dances.png')});
});

test('flower hands turn continuously and all new moves keep rigid attachments through inner leg switches',async({page,app})=>{
 await ready(page,app);const result=await page.evaluate(async()=>{
  const {characterMotion,actionDuration,danceMoves}=await import('/src/features/wedding/motions.js'),{dailyMoves}=await import('/src/features/wedding/dailyMotions.js'),{reviewRange}=await import('/src/features/wedding/reviewPose.js'),{rigidSide,upperPoint}=await import('/src/features/wedding/rigidRig.js'),{circularHandFrame,circularMotionHandles}=await import('/src/features/wedding/circularArm.js');
  let maxError=0,maxLengthError=0,maxHandStep=0,innerCount=0,flowerMax=0,kemusanMax=0;const lengths={};
  for(const id of [...dailyMoves.map(m=>m.id),...danceMoves.map(m=>m.id)]){let previous=null,previousUp=null;
   for(let i=0;i<=Math.ceil(actionDuration(id)*120);i++){const t=Math.min(actionDuration(id),i/120),f=characterMotion({gesture:id},t),points=[];
    for(const side of [-1,1]){const prefix=side<0?'left':'right',a=side<0?f.leftCircularArm:f.circularArm,r=rigidSide(f.rigidPose,side,f.rigidBindings),range=reviewRange(prefix+'Leg',{legAxis:r.leg.axis}),shoulder=reviewRange(prefix+'Shoulder',{up:a.up}),p=upperPoint(circularHandFrame(f.rigidPose,f.rigidBindings,a,side).palm,f.rigidPose,f.rigidBindings),elbow=circularMotionHandles(f.rigidPose,f.rigidBindings,a,side)[prefix+'Elbow'].pivot;
     const armLength=Math.hypot(p.x-elbow.x,p.y-elbow.y),legLength=Math.hypot(r.ankle.x-r.hip.x,r.ankle.y-r.hip.y);lengths[prefix+'Arm']??=armLength;lengths[prefix+'Leg']??=legLength;
     maxLengthError=Math.max(maxLengthError,Math.abs(armLength-lengths[prefix+'Arm']),Math.abs(legLength-lengths[prefix+'Leg']));maxError=Math.max(maxError,f.rigidPose[prefix+'Leg']-range.max,range.min-f.rigidPose[prefix+'Leg'],a.shoulder-shoulder.max,shoulder.min-a.shoulder,Math.abs(f.rigidPose[prefix+'Shoe'])-5);if(r.leg.axis==='inner')innerCount++;points.push(p);
     if(id==='flower')flowerMax=Math.max(flowerMax,a.bend);if(id==='dance-kemusan')kemusanMax=Math.max(kemusanMax,a.bend);
    }
    if(previous&&previousUp===f.circularArm.up)for(let k=0;k<2;k++)maxHandStep=Math.max(maxHandStep,Math.hypot(points[k].x-previous[k].x,points[k].y-previous[k].y));previous=points;previousUp=f.circularArm.up;
   }
  }return {maxError,maxLengthError,maxHandStep,innerCount,flowerMax,kemusanMax};
 });expect(result.maxError).toBeLessThan(1e-8);expect(result.maxLengthError).toBeLessThan(1e-5);expect(result.innerCount).toBeGreaterThan(100);expect(result.flowerMax).toBeGreaterThan(720);expect(result.kemusanMax).toBeGreaterThan(720);expect(result.maxHandStep).toBeLessThan(20);
});

test('hidden behaviours use independent local timers and stop when the player takes control',async({page,app})=>{
 await ready(page,app);const result=await page.evaluate(async()=>{
  const {createAmbientPeople,hiddenActions}=await import('/src/features/wedding/ambientPeople.js');let seed=17;const random=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  try{const player={x:0,y:0,persona:'guest'},a={x:90,y:0},b={x:-90,y:0},actors=[player,a,b],seen=new Set();let routes=0;const ambient=createAmbientPeople(actors,player,(actor,target)=>{routes++;return [target];});
   for(let time=20000;time<10000000;time+=10000){ambient.update(.05,time,false,false);for(const actor of actors)if(actor.ambientAction)seen.add(actor.ambientAction);}
   ambient.interrupt(10000000);player.gesture='clap';const before={x:player.x,y:player.y};for(let i=0;i<100;i++)ambient.update(.05,10000000+i*50,false,false);const after={x:player.x,y:player.y,action:player.ambientAction,walking:player.walking};return {seen:[...seen],hidden:hiddenActions,routes,before,after};
  }finally{Math.random=random;}
 });expect(result.hidden).toHaveLength(12);expect(result.seen).toEqual(expect.arrayContaining(['rest','blink','shift','look','nod','head-shake','cuff','head-scratch','toe-tap','greet','chat']));expect(result.routes).toBeGreaterThan(0);expect(result.after).toEqual({...result.before,action:'',walking:false});
});
