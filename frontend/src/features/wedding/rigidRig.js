import calibratedRig from "./calibratedRig.json";
import armAttachment from "./armAttachment.json";
import waistAttachment from "./waistAttachment.json";
import legAttachment from './legAttachment.json';
// The Kenney arm is ONE complete curved part, not two bones or two crops.
export const jointLabels={head:'头部',waist:'腰部',leftArm:'左整臂',rightArm:'右整臂',leftLeg:'左腿',rightLeg:'右腿',leftShoe:'左鞋',rightShoe:'右鞋'};
const {waist: waistLabel,...bindingJoints}=jointLabels;
export const bindingLabels={...bindingJoints,leftArm:'左肩连接点',rightArm:'右肩连接点'};
export const defaultPose=Object.fromEntries([...Object.keys(jointLabels),'leftHand','rightHand'].map(k=>[k,0]));
export const defaultBindings=structuredClone(calibratedRig.bindings);
for(const side of ['left','right']){
  Object.assign(defaultBindings[side+'Leg'],{sx:legAttachment.skin.top.x,sy:legAttachment.skin.top.y});
  defaultBindings[side+'Shoe']={x:legAttachment.skin.innerAnkle.x,y:legAttachment.skin.innerAnkle.y,sx:legAttachment.shoes[1].x,sy:legAttachment.shoes[1].y};
}
export const defaultBasePose={...defaultPose,...calibratedRig.basePose,leftHand:0,rightHand:0};
export const fixedHand={x:armAttachment.wrist.x,y:armAttachment.wrist.y,sx:armAttachment.handPivot.x,sy:armAttachment.handPivot.y};
export const fixedHandAngle=armAttachment.handAngle;
export const legOuterLimit=-11;
export const legInnerTravel=26;
export function rangeFor(key,waistAxis=0){
  if(key.endsWith('Hand'))return {min:0,max:0};
  if(key==='head')return {min:-20,max:20};
  if(key==='waist')return waistAxis===1?{min:-10,max:0}:{min:0,max:10};
  if(key.endsWith('Shoe'))return {min:-5,max:5};
  if(key.endsWith('Leg'))return {min:-11,max:9};
  if(key.endsWith('Arm'))return {min:0,max:35};
  return {min:-30,max:30};
}
export function normalizePose(value={},setup=false,waistAxis=0){return Object.fromEntries(Object.keys(defaultPose).map(k=>{
  if(k.endsWith('Hand'))return [k,0];
  const {min,max}=(k==='waist'||k.endsWith('Shoe'))?rangeFor(k,waistAxis):setup?{min:-180,max:180}:rangeFor(k);
  return [k,Number.isFinite(value[k])?Math.max(min,Math.min(max,value[k])):0];
}));}
export function normalizeBindings(value={}){
  // Migrate previously saved world-space hips to the waistband's local space.
  if(!value.waist){value={...value};for(const key of ['leftLeg','rightLeg'])if(value[key])value[key]={...value[key],x:value[key].x+76.5,y:value[key].y+190};}
  return Object.fromEntries(Object.entries(defaultBindings).map(([k,v])=>[k,k.endsWith('Hand')?{...fixedHand}:(k==='waist'||k==='neck')?{...defaultBindings[k],...(k==='waist'?{axis:value.waist?.axis===1?1:0}:{})}:{...Object.fromEntries(Object.entries(v).map(([axis,n])=>[axis,Number.isFinite(value[k]?.[axis])?Math.max(-650,Math.min(650,value[k][axis])):n])),...(k.endsWith('Leg')?{axis:value[k]?.axis==='inner'?'inner':'outer',pivotStyle:['long','short','shorter'].includes(value[k]?.pivotStyle)?value[k].pivotStyle:'long'}:{})}]));
}
const rad=n=>n*Math.PI/180;
const rotate=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
export const upperBodyDrop=2;
export const headNeckExtraDrop=2;
export function upperPoint(point,pose,bindings,head=false){return waistPoint({x:point.x,y:point.y+upperBodyDrop+(head?headNeckExtraDrop:0)},pose,bindings);}
export function waistTransform(pose,bindings){
  const side=bindings.waist.axis===1?1:0,p=waistAttachment.waist[side];
  return {pivot:{x:bindings.waist.x-bindings.waist.sx+p.x,y:bindings.waist.y-bindings.waist.sy+p.y},angle:rad(pose.waist||0)};
}
export function waistPoint(point,pose,bindings,inverse=false){const {pivot,angle}=waistTransform(pose,bindings);const p=rotate({x:point.x-pivot.x,y:point.y-pivot.y},inverse?-angle:angle);return {x:pivot.x+p.x,y:pivot.y+p.y};}
export function fromPart(parent,source,local,angle,side){const p=rotate({x:local.x-source.sx,y:local.y-source.sy},angle);return {x:parent.x+side*p.x,y:parent.y+p.y};}
export function toPart(parent,source,world,angle,side){const p=rotate({x:side*(world.x-parent.x),y:world.y-parent.y},-angle);return {x:p.x+source.sx,y:p.y+source.sy};}
export function rigidSide(pose,side,bindings=defaultBindings){
  const prefix=side<0?'left':'right',arm=bindings[prefix+'Arm'],hand=fixedHand,leg=bindings[prefix+'Leg'],shoe=bindings[prefix+'Shoe'];
  const shoulder={x:arm.x,y:arm.y},armAngle=rad(42+pose[prefix+'Arm']);
  const wrist=fromPart(shoulder,arm,hand,armAngle,side);
  const waist=bindings.waist||defaultBindings.waist;
  const outer={x:waist.x-waist.sx+leg.x,y:waist.y-waist.sy+leg.y},localLegAngle=.12+rad(pose[prefix+'Leg']);
  // Freeze the inner SVG vertex at its position at the outer stop. Translating
  // the rigid group's origin preserves every point at the instant of switching.
  const style=leg.pivotStyle||'long',pants=legAttachment.pants[style],pantsInner=legAttachment.pantsInner[style];
  const relative=rotate({x:pantsInner.x-pants.x,y:pantsInner.y-pants.y},rad(-3));
  const innerSource={x:leg.sx+relative.x,y:leg.sy+relative.y};
  const inner=fromPart(outer,leg,innerSource,.12+rad(legOuterLimit),side);
  const offset=fromPart({x:0,y:0},leg,innerSource,localLegAngle,side);
  const hip=leg.axis==='inner'?{x:inner.x-offset.x,y:inner.y-offset.y}:outer;
  const ankle=fromPart(hip,leg,shoe,localLegAngle,side);
  const legInner=fromPart(hip,leg,innerSource,localLegAngle,side);
  return {prefix,side,shoulder,wrist,armAngle,hip,legPivot:leg.axis==='inner'?inner:outer,legInner,legOuter:hip,legAngle:side*localLegAngle,localLegAngle,ankle,arm,hand,leg,shoe};
}
export function rigidHandles(value,bindings=defaultBindings){
  const pose=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,Number.isFinite(value[k])?value[k]:0])),head=bindings.head;
  const h=rotate({x:0,y:-105},rad(pose.head));
  const result={head:{pivot:{x:head.x,y:head.y},tip:{x:head.x+h.x,y:head.y+h.y},parent:0,rest:-90,side:1}};
  const waist=waistTransform(pose,bindings),waistTip=rotate({x:0,y:55},waist.angle);
  result.waist={pivot:waist.pivot,tip:{x:waist.pivot.x+waistTip.x,y:waist.pivot.y+waistTip.y},parent:0,rest:90,side:1};
  for(const side of [-1,1]){
    const r=rigidSide(pose,side,bindings),p=r.prefix;
    result[p+'Arm']={pivot:r.shoulder,tip:r.wrist,parent:0,rest:42+Math.atan2(r.hand.y-r.arm.sy,r.hand.x-r.arm.sx)*180/Math.PI,side};
    result[p+'Leg']={pivot:r.legPivot,tip:{x:r.legPivot.x+(r.ankle.x-r.legPivot.x)*.55,y:r.legPivot.y+(r.ankle.y-r.legPivot.y)*.55},parent:0,rest:Math.atan2(r.shoe.y-r.leg.sy,r.shoe.x-r.leg.sx)*180/Math.PI+.12*180/Math.PI,side};
    // Zero local swing is horizontal in the resting pose; inherit leg motion
    // without inheriting the template's fixed 0.12-radian inward tilt.
    const shoeTip=rotate({x:62,y:0},rad(pose[p+'Leg']+pose[p+'Shoe']));
    result[p+'Shoe']={pivot:r.ankle,tip:{x:r.ankle.x+side*shoeTip.x,y:r.ankle.y+shoeTip.y},parent:pose[p+'Leg'],rest:0,side};
  }
  for(const [key,h] of Object.entries(result))if(key==='head'||/(Arm|Hand)$/.test(key)){h.pivot=upperPoint(h.pivot,pose,bindings,key==='head');h.tip=upperPoint(h.tip,pose,bindings,key==='head');h.parent+=h.side*(pose.waist||0);}
  return result;
}
export function bindingPoints(pose,bindings){const h=rigidHandles(pose,bindings);return Object.fromEntries(Object.entries(h).filter(([k])=>k!=='waist').map(([k,v])=>[k,v.pivot]));}
export function bindingFromWorld(key,point,pose,bindings){
  const side=key.startsWith('left')?-1:1,r=rigidSide(pose,side,bindings);
  if(key==='head'||/(Arm|Hand)$/.test(key)){point=waistPoint(point,pose,bindings,true);point.y-=upperBodyDrop+(key==='head'?headNeckExtraDrop:0);}
  if(key.endsWith('Hand'))return toPart(r.shoulder,r.arm,point,r.armAngle,side);
  if(key.endsWith('Shoe'))return toPart(r.hip,r.leg,point,r.localLegAngle,side);
  if(key.endsWith('Leg')){const p=point;return {x:p.x-bindings.waist.x+bindings.waist.sx,y:p.y-bindings.waist.y+bindings.waist.sy};}
  return point;
}
export function angleFromDrag(handle,point){const dx=(point.x-handle.pivot.x)*handle.side,dy=point.y-handle.pivot.y;const raw=Math.atan2(dy,dx)*180/Math.PI-handle.rest-handle.parent;return Math.round(((raw+540)%360)-180);}
export function drawRigidArm(ctx,image,r,sleeve=false){
  ctx.save();ctx.translate(r.shoulder.x,r.shoulder.y);ctx.scale(r.side,1);ctx.rotate(r.armAngle);
  const dx=sleeve?armAttachment.sleeveTop.x-armAttachment.armTop.x:0;
  const dy=sleeve?armAttachment.sleeveTop.y-armAttachment.armTop.y:0;
  ctx.drawImage(image,-r.arm.sx-dx,-r.arm.sy-dy);ctx.restore();
}
