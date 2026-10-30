import {test,expect} from '../fixtures/app.mjs';
import {artifactPath} from '../artifactPath.mjs';

test('default face IDs reach guests and NPCs, custom faces and the groom win, and reentry stays stable',async({page,app})=>{
 app.admin=true;app.weddingNpcFaces={florist:'face-completes-face2',juggler:'face-completes-face3'};
 app.weddingPeople=[{username:'owner-groom',name:'新郎',role:'groom',facePreset:'face-completes-face4'},{username:'owner-bride',name:'新娘',role:'bride',facePreset:'face-completes-face2'},{username:'shenqidayang',name:'女孩',persona:'calm-girl',facePreset:'face-completes-face3'},{username:'lqc',name:'男孩',persona:'lively-boy',facePreset:'face-completes-face2',appearance:{face:'face-completes-face4'}}];
 await page.goto('/wedding');const canvas=page.locator('.wedding-canvas canvas');await expect(canvas).toHaveAttribute('data-people',/face-completes-face3/);
 const faces=await canvas.evaluate(el=>JSON.parse(el.dataset.people).map(p=>[p.kind,p.username,p.face]));
 expect(faces.find(p=>p[1]==='owner-groom')[2]).toBe('face-completes-face1');expect(faces.find(p=>p[1]==='owner-bride')[2]).toBe('face-completes-face2');expect(faces.find(p=>p[1]==='shenqidayang')[2]).toBe('face-completes-face3');expect(faces.find(p=>p[1]==='lqc')[2]).toBe('face-completes-face4');expect(faces.find(p=>p[0]==='florist')[2]).toBe('face-completes-face2');expect(faces.find(p=>p[0]==='juggler')[2]).toBe('face-completes-face3');
 await page.reload();await expect(canvas).toHaveAttribute('data-people',/face-completes-face3/);expect(await canvas.evaluate(el=>JSON.parse(el.dataset.people).map(p=>[p.kind,p.username,p.face]))).toEqual(faces);
});

test('poppers extend away from the body and left-hand art mirrors around its grip in both views',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/rig');await expect(page.locator('.stage image')).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {characterMotion}=await import('/src/features/wedding/motions.js'),{circularHandFrame,circularMotionHandles}=await import('/src/features/wedding/circularArm.js'),{upperPoint}=await import('/src/features/wedding/rigidRig.js'),{assignCarryHand,heldPlacement}=await import('/src/features/wedding/heldItems.js'),{items}=await import('/src/features/wedding/amenities.js'),{loadCharacters}=await import('/src/features/wedding/characters.js'),{makeAppearance}=await import('/src/features/wedding/catalog.js');
  const art=await loadCharacters(),appearance=await art.ensureAppearance(makeAppearance()),canvas=document.createElement('canvas');canvas.id='popper-review';canvas.width=1600;canvas.height=800;canvas.style.cssText='position:fixed;inset:0;z-index:99999;background:#f6f0e7';document.body.append(canvas);const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),samples=[],determinants=[];
  for(const [row,id] of ['popper-garden','popper-festive'].entries()){
   const source=items.find(i=>i.id===id);await art.ensureHeldItem(source);const image=new Image();image.src=source.image;await image.decode();
   for(const side of [-1,1]){
    const item=assignCarryHand(source,()=>side<0?.1:.9),f=characterMotion({heldItem:item},0),l=circularHandFrame(f.rigidPose,f.rigidBindings,f.leftCircularArm,-1).palm,r=circularHandFrame(f.rigidPose,f.rigidBindings,f.circularArm,1).palm,palm=upperPoint(side<0?l:r,f.rigidPose,f.rigidBindings),prefix=side<0?'left':'right',arm=side<0?f.leftCircularArm:f.circularArm,elbow=circularMotionHandles(f.rigidPose,f.rigidBindings,arm,side)[prefix+'Elbow'].pivot,p=heldPlacement(item,image,l,r);
    const anchorX=p.x+item.anchors.hand[0]*p.width,visibleAnchor=p.mirrored?2*p.grip.x-anchorX:anchorX;
    samples.push({outward:(palm.x-elbow.x)*side,mirrored:p.mirrored,gripError:Math.abs(visibleAnchor-p.grip.x),side});
    for(const back of [false,true]){ctx.drawImage=(im,...args)=>{if(im.src?.endsWith(`/${id}.webp`)){const m=ctx.getTransform();determinants.push({side,det:m.a*m.d-m.b*m.c});}draw(im,...args);};ctx.save();ctx.translate((side<0?0:800)+(back?600:200),row*400+370);ctx.scale(1.8,1.8);art.draw(ctx,{x:0,y:0,appearance,heldItem:item,direction:back?'back':'front'},0,true);ctx.restore();}
   }
  }
  art.dispose();return {samples,determinants};
 });
 for(const sample of result.samples){expect(sample.outward).toBeGreaterThan(60);expect(sample.mirrored).toBe(sample.side<0);expect(sample.gripError).toBeLessThan(1e-8);}expect(result.determinants).toHaveLength(8);for(const sample of result.determinants)expect(Math.sign(sample.det)).toBe(sample.side);
 await page.locator('#popper-review').screenshot({path:artifactPath('wedding-poppers-outward.png')});
});
