// Reproducible contour projection. Read-only source SVGs, no image deformation.
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const root=new URL('../../',import.meta.url);
const input=JSON.parse(await fs.readFile(new URL('asset/wedding/rig/user-bindings.json',root),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const constraints=[];
async function project(name,file,indices,size,point){
  await page.setContent(await fs.readFile(new URL(`asset/wedding/kenney_modular-characters/Vector/${file}`,root),'utf8'));
  const result=await page.evaluate(({indices,size,point})=>{
    const all=[...document.querySelectorAll('path')],paths=indices.map(i=>all[i]);
    const boxes=paths.map(p=>p.getBBox());
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
    const width=Math.max(...boxes.map(b=>b.x+b.width))-x,height=Math.max(...boxes.map(b=>b.y+b.height))-y;
    const map=p=>({x:(p.x-x)*size[0]/width,y:(p.y-y)*size[1]/height});
    let best={distance:Infinity};
    for(let i=0;i<paths.length;i++){
      const path=paths[i],length=path.getTotalLength();
      const distance=s=>{const p=map(path.getPointAtLength(s));return Math.hypot(p.x-point.x,p.y-point.y);};
      let s=0,min=Infinity;const step=length/4096;
      for(let j=0;j<=4096;j++){const d=distance(j*step);if(d<min){min=d;s=j*step;}}
      let lo=Math.max(0,s-step),hi=Math.min(length,s+step);
      for(let j=0;j<40;j++){const a=(2*lo+hi)/3,b=(lo+2*hi)/3;if(distance(a)<distance(b))hi=b;else lo=a;}
      s=(lo+hi)/2;
      if(distance(s)<best.distance){
        const p=map(path.getPointAtLength(s)),a=map(path.getPointAtLength(Math.max(0,s-.01))),b=map(path.getPointAtLength(Math.min(length,s+.01)));
        const n=Math.hypot(b.x-a.x,b.y-a.y);
        best={pathIndex:indices[i],arcFraction:s/length,point:p,distance:distance(s),tangent:{x:(b.x-a.x)/n,y:(b.y-a.y)/n}};
      }
    }
    return {...best,svgBounds:{x,y,width,height},pixelSize:size};
  },{indices,size,point});
  constraints.push({name,source:file,input:point,...result});return result.point;
}
try{
  const b=structuredClone(input.bindings);
  const shirtLeft=await project('shirt lower left','vector_shirts.svg',[0],[153,174],{x:5,y:168.5});
  const shirtRight=await project('shirt lower right','vector_shirts.svg',[0],[153,174],{x:148,y:168.5});
  const waistLeft=await project('waist upper left','vector_pants.svg',[0,1],[153,47],{x:5,y:0});
  const waistRight=await project('waist upper right','vector_pants.svg',[0,1],[153,47],{x:148,y:0});
  // Rigid two-point registration: centroid translation, zero relative rotation.
  // Preserve source dimensions; any export-rounding mismatch is recorded, not stretched away.
  b.waist={x:((shirtLeft.x-waistLeft.x)+(shirtRight.x-waistRight.x))/2,
    y:-348+((shirtLeft.y-waistLeft.y)+(shirtRight.y-waistRight.y))/2,sx:76.5,sy:0};
  const collarLeft=await project('collar upper left','vector_shirts.svg',[0],[153,174],{x:28.7,y:0});
  const collarRight=await project('collar upper right','vector_shirts.svg',[0],[153,174],{x:124.3,y:0});
  const neckLeft=await project('neck left attachment','vector_skin.svg',[5],[96,37],{x:0,y:8.8});
  const neckRight=await project('neck right attachment','vector_skin.svg',[5],[96,37],{x:96,y:8.8});
  b.neck={x:((collarLeft.x-76.5-(neckLeft.x-48))+(collarRight.x-76.5-(neckRight.x-48)))/2,
    y:-348+((collarLeft.y-neckLeft.y)+(collarRight.y-neckRight.y))/2,sx:0,sy:0};
  // Paths 0/1: one complete waistband; paths 12/13/14: matching long leg.
  await project('right waist lower edge','vector_pants.svg',[0,1],[153,47],{x:b.rightLeg.x,y:b.rightLeg.y});
  const waistConstraint=constraints.at(-1);
  await project('leg outer top','vector_pants.svg',[12,13,14],[111,166],{x:b.rightLeg.sx,y:b.rightLeg.sy});
  const legConstraint=constraints.at(-1);
  function authoredVertex(constraint,vertex,pathIndex){
    const bounds=constraint.svgBounds,[w,h]=constraint.pixelSize;
    const point={x:(vertex.x-bounds.x)*w/bounds.width,y:(vertex.y-bounds.y)*h/bounds.height};
    constraint.nearestProjection=constraint.point;
    constraint.point=point;constraint.vertex=vertex;constraint.pathIndex=pathIndex;
    constraint.selection='exact authored SVG path corner, not nearest contour projection';
    constraint.distance=Math.hypot(point.x-constraint.input.x,point.y-constraint.input.y);
    // The retained arcFraction/tangent describe the earlier projection only.
    delete constraint.arcFraction;delete constraint.tangent;
    return point;
  }
  // Explicit path-command vertices: waistband L157.7 48.45, leg Q...147.15 97.95.
  const right=authoredVertex(waistConstraint,{x:157.7,y:48.45},1);
  const top=authoredVertex(legConstraint,{x:147.15,y:97.95},14);
  for(const side of ['left','right']){
    b[side+'Leg']={x:side==='right'?right.x:153-right.x,y:right.y,sx:top.x,sy:top.y};
  }
  async function corners(name,file,indices,size,vertices){
    await project(name,file,indices,size,{x:0,y:0});
    const constraint=constraints.at(-1),bounds=constraint.svgBounds;
    const points=vertices.map(v=>({x:(v.x-bounds.x)*size[0]/bounds.width,y:(v.y-bounds.y)*size[1]/bounds.height}));
    Object.assign(constraint,{vertices,points,selection:'explicit SVG vertices',point:points[0]});
    delete constraint.arcFraction;delete constraint.tangent;delete constraint.distance;
    return points;
  }
  const [shoulder]=await corners('shirt outer collar corner','vector_shirts.svg',[0],[153,174],[{x:70.55,y:25.8}]);
  const [armTop,armEndA,armEndB]=await corners('arm upper corner and terminal edge','vector_skin.svg',[0],[170,136],[{x:133.2,y:63.8},{x:188,y:98.15},{x:177.05,y:108.75}]);
  const [handA,handB]=await corners('hand attachment edge','vector_skin.svg',[2],[61,71],[{x:133.75,y:31.15},{x:139.6,y:53.05}]);
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const wrist=midpoint(armEndA,armEndB),handPivot=midpoint(handA,handB);
  const handAngle=(Math.atan2(armEndB.y-armEndA.y,armEndB.x-armEndA.x)-Math.atan2(handB.y-handA.y,handB.x-handA.x))*180/Math.PI;
  const [sleeveTop]=await corners('sleeve upper corner','vector_shirts.svg',[7,8,9],[171,142],[{x:280.35,y:25.35}]);
  for(const side of ['left','right']){
    b[side+'Arm']={x:(side==='left'?-1:1)*(shoulder.x-76.5),y:shoulder.y-348,sx:armTop.x,sy:armTop.y};
    b[side+'Hand']={x:wrist.x,y:wrist.y,sx:handPivot.x,sy:handPivot.y};
  }
  // Preserve user-established source anchors and pose. Only snap the two
  // expressly edge-bound constraints; interior joint pivots need not lie on a contour.
  const pose={...input.pose}; // Preserve the reviewed pose, including its small head tilt.
  pose.leftHand=pose.rightHand=handAngle;
  const armAttachment={shoulder,armTop,sleeveTop,armEnd:[armEndA,armEndB],handEdge:[handA,handB],wrist,handPivot,handAngle};
  await fs.writeFile(new URL('frontend/src/features/wedding/armAttachment.json',root),JSON.stringify(armAttachment,null,2)+'\n');
  const output={version:3,mode:'whole-arm-bindings',locked:true,bindings:b,pose:Object.fromEntries(Object.keys(pose).map(k=>[k,0])),poseConfirmed:true,basePose:pose,appearance:input.appearance};
  await fs.writeFile(new URL('frontend/src/features/wedding/calibratedRig.json',root),JSON.stringify(output,null,2)+'\n');
  const waistAttachment={shirt:[shirtLeft,shirtRight],waist:[waistLeft,waistRight],translation:b.waist,
    spanError:Math.hypot(shirtRight.x-shirtLeft.x,shirtRight.y-shirtLeft.y)-Math.hypot(waistRight.x-waistLeft.x,waistRight.y-waistLeft.y)};
  await fs.writeFile(new URL('frontend/src/features/wedding/waistAttachment.json',root),JSON.stringify(waistAttachment,null,2)+'\n');
  await fs.writeFile(new URL('frontend/src/features/wedding/neckAttachment.json',root),JSON.stringify({shirt:[collarLeft,collarRight],neck:[neckLeft,neckRight],translation:b.neck},null,2)+'\n');
  await fs.writeFile(new URL('asset/wedding/rig/contour-constraints.json',root),JSON.stringify({method:'explicit SVG vertices for corners and edge midpoints; contour projection for smooth edges',waistAttachment,armAttachment,constraints},null,2)+'\n');
  const exportDirectory=join(tmpdir(),'QN_web-tools');
  await fs.mkdir(exportDirectory,{recursive:true});
  await fs.writeFile(join(exportDirectory,'wedding-rigid-calibrated.json'),JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify(constraints.map(c=>({name:c.name,point:c.point,correction:c.distance,path:c.pathIndex,t:c.arcFraction})),null,2));
}finally{await browser.close();}
