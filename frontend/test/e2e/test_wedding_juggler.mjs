import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';

test('real visitor avatars replace numbered guests and the QR performer throws exactly the supplied three props',async({page,app})=>{
 app.allowedPages=['/index','/wedding'];await page.setViewportSize({width:1440,height:1000});const propRequests=[];page.on('request',r=>{if(r.url().includes('/wedding/juggler/'))propRequests.push(r.url());});
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-juggling',/gold-ingot/);
 const people=JSON.parse(await canvas.getAttribute('data-people'));expect(people.filter(p=>p.npc)).toHaveLength(2);expect(people.filter(p=>/来宾\s*\d/.test(p.name))).toEqual([]);
 expect(people.filter(p=>p.username==='shenqidayang')).toHaveLength(1);expect(people.filter(p=>p.username==='lqc')).toHaveLength(1);
 const juggler=people.find(p=>p.kind==='juggler');expect(Math.hypot(juggler.x-1295,juggler.y-255)).toBeLessThan(150);expect(juggler.x).toBeLessThan(1295);
 expect(people.find(p=>p.kind==='florist')).toMatchObject({x:310,y:265});
 const stand=page.locator('.qr-stand');await expect(stand.locator('img')).toHaveCount(0);await expect(stand).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 const initial=await canvas.getAttribute('data-juggling');expect(JSON.parse(initial).map(p=>p.id)).toEqual(['gold-ingot','gold-bar','lucky-coins']);await expect.poll(()=>canvas.getAttribute('data-juggling')).not.toBe(initial);
 await expect(page.locator('.juggler-speech')).toContainText('祝大家财源滚滚，事业有成，份子拿来！');expect(propRequests).toHaveLength(3);expect(app.weddingPeopleReads).toBe(1);expect(app.wardrobeWrites).toBe(0);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.getAttribute('data-juggling')).toContain('gold-ingot');const still=await canvas.getAttribute('data-juggling');await page.waitForTimeout(350);expect(await canvas.getAttribute('data-juggling')).toBe(still);
 await page.screenshot({path:artifactPath('wedding-juggler-garden.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.wedding-labels')).toContainText('shenqidayang');await expect(page.locator('.wedding-labels')).toContainText('lqc');
 await page.getByRole('navigation',{name:'婚礼招待'}).getByRole('button',{name:'随个份子',exact:false}).click();await expect(page.locator('.amenity-dialog')).toBeVisible();await page.getByRole('button',{name:'关闭招待面板',exact:true}).click();await expect(page.locator('.juggler-speech')).toBeVisible();
 await stand.click();await expect(page.locator('.payment-code')).toHaveJSProperty('naturalWidth',1118);await page.getByRole('button',{name:'关闭招待面板',exact:true}).click();
 await page.screenshot({path:artifactPath('wedding-juggler-mobile.png'),fullPage:true});expect(app.weddingPeopleReads).toBe(1);
});

test('three-prop cascade catches at the real palms and keeps rigid arm limits',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {jugglingFrame,jugglerHands,jugglerConfiguration,jugglingBeat}=await import('/src/features/wedding/juggling.js');let catchError=0,heldMax=0,angleError=0;
  for(let t=0;t<10;t+=.031){const frame=jugglingFrame(t),pose=jugglerConfiguration(t);if(frame.length!==3||new Set(frame.map(p=>p.id)).size!==3)throw Error('prop count');heldMax=Math.max(heldMax,frame.filter(p=>!p.airborne).length);for(const p of frame)if(!Number.isFinite(p.x+p.y+p.rotation)||Math.abs(p.x)>60||p.y>0||p.y< -200)throw Error('invalid trajectory');for(const arm of [pose.leftCircularArm,pose.circularArm])angleError=Math.max(angleError,-arm.shoulder,arm.shoulder-35,-arm.bend,arm.bend-160);}
  for(let i=0;i<3;i++)for(let k=0;k<5;k++){
   const start=i*jugglingBeat+k*jugglingBeat*3;
   for(const time of [start,start+jugglingBeat*2.5,start+jugglingBeat*2.8]){const p=jugglingFrame(time)[i],hand=jugglerHands(time)[time===start?p.side:-p.side];catchError=Math.max(catchError,Math.hypot(p.x-hand.x,p.y-hand.y));}
  }
  return {catchError,heldMax,angleError,still:JSON.stringify(jugglingFrame(0,true))===JSON.stringify(jugglingFrame(100,true))};
 });expect(result.catchError).toBeLessThan(1e-8);expect(result.heldMax).toBeLessThanOrEqual(1);expect(result.angleError).toBe(0);expect(result.still).toBe(true);
});

test('all listed visitors exist locally with one controlled avatar and no polling',async({page,app})=>{
 app.allowedPages=['/index','/wedding'];app.profileUsername='lqc';app.nickname='数据库男孩';
 app.weddingPeople=[{username:'owner-groom',name:'数据库新郎',role:'groom'},{username:'owner-bride',name:'数据库新娘',role:'bride'},
  {username:'shenqidayang',name:'数据库女孩',persona:'calm-girl'},{username:'lqc',name:'数据库男孩',persona:'lively-boy'},
  ...Array.from({length:40},(_,i)=>({username:`visitor-${i}`,name:`真实访客 ${i+1}`,persona:'guest'}))];
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-player-persona','lively-boy');
 const people=JSON.parse(await canvas.getAttribute('data-people'));expect(people).toHaveLength(46);expect(people.filter(p=>p.username==='lqc')).toHaveLength(1);expect(people.filter(p=>p.username)).toHaveLength(44);
 await expect(page.locator('.wedding-title')).toContainText('数据库新郎 & 数据库新娘');expect(people.find(p=>p.username==='shenqidayang').name).toBe('数据库女孩');expect(people.find(p=>p.username==='lqc').name).toBe('数据库男孩');
 await page.getByRole('button',{name:'↟ 跳跃',exact:true}).click();await expect(canvas).toHaveAttribute('data-gesture','idle');expect(app.weddingPeopleReads).toBe(1);expect(app.wardrobeWrites).toBe(0);
});
