import { artifactPath } from '../artifactPath.mjs';
import {test,expect} from '../fixtures/app.mjs';

test('forearm depth preserves complete groups and occludes hands behind front and back clothing',async({page,app})=>{
 app.admin=true;await page.setViewportSize({width:1440,height:1500});await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const proof=await page.evaluate(async()=>{
  const {loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance,resolveParts}=await import('/src/features/wedding/catalog.js'),{defaultBasePose,defaultBindings,rigidSide,upperBodyDrop}=await import('/src/features/wedding/rigidRig.js'),{normalizeReviewArm}=await import('/src/features/wedding/reviewPose.js'),{drawCircularArm}=await import('/src/features/wedding/circularArm.js');
  const art=await loadCharacters(),records=[],overlaps=[];
  const gallery=document.createElement('canvas');gallery.width=1380;gallery.height=1220;gallery.id='occlusion-proof';gallery.style.cssText='position:fixed;inset:0;z-index:99999;background:#fffdf8';document.body.append(gallery);const gc=gallery.getContext('2d');
  for(const direction of ['front','back'])for(const sleeve of ['long','shorter','none'])for(const up of [false,true])for(const mode of ['auto','front','back']){
   const a=await art.ensureAppearance({...makeAppearance(),sleeve}),canvas=document.createElement('canvas');canvas.width=600;canvas.height=670;
   const body=document.createElement('canvas');body.width=600;body.height=670;const bc=body.getContext('2d'),c=canvas.getContext('2d'),draw=c.drawImage.bind(c),calls=[];
   c.drawImage=(im,...args)=>{const src=decodeURIComponent(im.src||'cache'),isArm=/tint1_arm|tint1_hand|blueArm_|Derived\/rig\//.test(src);calls.push({src,isArm,hand:src.endsWith('tint1_hand.png'),sleeve:/blueArm_|rig\/sleeve-/.test(src)});if(!isArm){bc.setTransform(c.getTransform());bc.drawImage(im,...args);}draw(im,...args);};
   const right=normalizeReviewArm({up,shoulder:up?8:45,bend:up?60:35,forearmLayers:{front:mode,back:mode}}),left=normalizeReviewArm({},false,-1);
   c.translate(300,590);c.scale(4,4);art.draw(c,{x:0,y:0,appearance:a,direction,rigidPose:defaultBasePose,rigidBindings:defaultBindings,circularArm:right,leftCircularArm:left},0,true);
   const hands=calls.flatMap((p,i)=>p.hand?[i]:[]),bodyIndices=calls.flatMap((p,i)=>!p.isArm?[i]:[]),head=calls.findIndex(p=>p.src.endsWith('tint1_head.png'));
   const group=mode==='back'?hands[0]:hands[1];
   records.push({direction,sleeve,up,mode,handCount:hands.length,group,firstBody:bodyIndices[0],lastBody:bodyIndices.at(-1),head,nextIsSleeve:calls[group+1]?.sleeve});
   if(sleeve==='long'&&!up){
    const row=direction==='front'?0:1,column=['auto','back','front'].indexOf(mode);gc.drawImage(canvas,0,0,600,670,column*460,45+row*610,460,514);gc.fillStyle='#52634f';gc.font='18px sans-serif';gc.fillText(`${direction} / ${mode}`,column*460+18,row*610+28);
    if(mode!=='auto'){
     const parts=resolveParts(a),images={};for(const slot of ['arm','hand','sleeve']){const im=new Image();im.src='/wedding/kenney_modular-characters/PNG/'+parts[slot].original;await im.decode();images[slot]=im;}
     const mask=document.createElement('canvas');mask.width=600;mask.height=670;const mc=mask.getContext('2d');mc.translate(300,590+upperBodyDrop);drawCircularArm(mc,rigidSide(defaultBasePose,1,defaultBindings),defaultBasePose,{...right,longSleeve:true},images,'front');
     const m=mc.getImageData(0,0,600,670).data,b=bc.getImageData(0,0,600,670).data,p=c.getImageData(0,0,600,670).data;let eligible=0,correct=0;
     for(let i=0;i<m.length;i+=4){if(m[i]!==255||m[i+1]!==224||m[i+2]!==177||m[i+3]<254||b[i+3]<254||Math.abs(b[i]-255)+Math.abs(b[i+1]-224)+Math.abs(b[i+2]-177)<60)continue;eligible++;const expected=mode==='front'?m:b;if(Math.max(Math.abs(p[i]-expected[i]),Math.abs(p[i+1]-expected[i+1]),Math.abs(p[i+2]-expected[i+2]))<3)correct++;}
     overlaps.push({direction,mode,eligible,correct});
    }
   }
  }art.dispose();return {records,overlaps};
 });
 for(const r of proof.records){expect(r.handCount).toBe(2);if(r.mode==='back')expect(r.group).toBeLessThan(r.firstBody);else if(r.mode==='front')expect(r.group).toBeGreaterThan(r.lastBody);else if(r.direction==='front')expect(r.group).toBeGreaterThan(r.head);else expect(r.group).toBeLessThan(r.head);if(r.sleeve!=='none')expect(r.nextIsSleeve).toBe(true);}
 for(const overlap of proof.overlaps){expect(overlap.eligible).toBeGreaterThan(20);expect(overlap.correct/overlap.eligible).toBeGreaterThan(.99);}
 await page.locator('#occlusion-proof').screenshot({path:artifactPath('review-arm-occlusion.png')});await page.locator('#occlusion-proof').evaluate(el=>el.remove());
});

test('each arm and view saves depth separately without changing joint geometry',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const choose=async(key,value)=>{await page.getByLabel('选中部件',{exact:true}).selectOption(key);if(value!==undefined)await page.getByLabel('旋转角度',{exact:true}).fill(String(value));};
 await choose('rightShoulder',45);await choose('rightElbow',35);
 const geometry=()=>page.locator('[data-motion-root="rightElbow"]').evaluate(el=>[el.getAttribute('cx'),el.getAttribute('cy')]);const before=await geometry(),picture=await page.locator('.stage image').getAttribute('href');
 await page.getByRole('button',{name:'最后',exact:true}).click();expect(await geometry()).toEqual(before);await expect(page.getByLabel('旋转角度',{exact:true})).toHaveValue('35');await expect.poll(()=>page.locator('.stage image').getAttribute('href')).not.toBe(picture);
 await choose('leftElbow');await expect(page.getByRole('button',{name:'自动',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'最前',exact:true}).click();
 await page.getByRole('button',{name:'背面',exact:true}).click();await expect(page.getByRole('button',{name:'自动',exact:true})).toHaveAttribute('aria-pressed','true');await choose('rightElbow');await page.getByRole('button',{name:'最后',exact:true}).click();
 await page.getByRole('button',{name:'正面',exact:true}).click();await expect(page.getByRole('button',{name:'最后',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'保存到本机',exact:true}).click();await page.reload();await expect(page.locator('.stage image')).toBeVisible();
 await choose('leftElbow');await expect(page.getByRole('button',{name:'最前',exact:true})).toHaveAttribute('aria-pressed','true');await choose('rightElbow');await expect(page.getByRole('button',{name:'最后',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'背面',exact:true}).click();await expect(page.getByRole('button',{name:'最后',exact:true})).toHaveAttribute('aria-pressed','true');
});
