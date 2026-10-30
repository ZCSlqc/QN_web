import {defaultBasePose,defaultBindings,upperPoint} from './rigidRig';
import {normalizeReviewArm} from './reviewPose';
import {circularHandFrame} from './circularArm';
import {loadOriginalImages} from './originalArt';

export const jugglerPosition={x:1180,y:265};
export const jugglerSaying='祝大家财源滚滚，事业有成，份子拿来！';
export const jugglingBeat=.6;
export const jugglingProps=[{id:'gold-ingot',label:'元宝',width:26},{id:'gold-bar',label:'金条',width:34},{id:'lucky-coins',label:'钱币',width:26}];

export function jugglerConfiguration(time,reduced=false){
 const t=reduced?0:time,beat=t*Math.PI*2/(jugglingBeat*2),s=Math.sin(beat),c=Math.cos(beat);
 return {rigidPose:{...defaultBasePose,head:Math.sin(t*2)*3},rigidBindings:defaultBindings,
  leftCircularArm:normalizeReviewArm({shoulder:8+3*s,bend:64-12*c},false,-1),
  circularArm:normalizeReviewArm({shoulder:8-3*s,bend:64+12*c},false,1),
  lift:0,shadowScale:1,motionName:'juggle',holding:false,facePose:{eyeOpen:reduced?1:t%4.3>4.16?.12:1,mouthScale:1},
 };
}
const handSamples=new Map();
export function jugglerHands(time,reduced=false){
 const key=reduced?'still':time;if(handSamples.has(key))return handSamples.get(key);
 const f=jugglerConfiguration(time,reduced),out={};
 for(const side of [-1,1]){const arm=side<0?f.leftCircularArm:f.circularArm,p=upperPoint(circularHandFrame(f.rigidPose,f.rigidBindings,arm,side).palm,f.rigidPose,f.rigidBindings);out[side]={x:p.x*.25,y:p.y*.25};}
 handSamples.set(key,out);if(handSamples.size>48)handSamples.delete(handSamples.keys().next().value);return out;
}
let lastFrame;
export function jugglingFrame(time,reduced=false){
 if(lastFrame?.time===time&&lastFrame.reduced===reduced)return lastFrame.props;
 const t=reduced?.8:time,cycle=jugglingBeat*3,flight=jugglingBeat*2.5;
 const props=jugglingProps.map((prop,i)=>{
  const shifted=t-i*jugglingBeat,k=Math.floor((shifted+1e-10)/cycle),local=Math.max(0,shifted-k*cycle),start=i*jugglingBeat+k*cycle,side=(i+k)%2===0?-1:1,p=Math.min(1,local/flight),airborne=local<flight;
  const from=jugglerHands(start,reduced)[side],to=jugglerHands(start+flight,reduced)[-side],held=jugglerHands(t,reduced)[-side];
  return {...prop,side,progress:p,airborne,x:airborne?from.x+(to.x-from.x)*p:held.x,y:airborne?from.y+(to.y-from.y)*p-4*118*p*(1-p):held.y,rotation:airborne?(i===0?.22*Math.sin(p*Math.PI*2):side*p*Math.PI*2):0};
 });
 lastFrame={time,reduced,props};return props;
}

export async function loadJugglerProps(){
 const images=await loadOriginalImages(jugglingProps.map(p=>p.id));
 return {draw(ctx,actor,time,reduced){
  const frame=jugglingFrame(time,reduced);
  for(const prop of frame){const image=images.get(prop.id),height=prop.width*image.naturalHeight/image.naturalWidth;ctx.save();ctx.translate(actor.x+prop.x,actor.y+prop.y-height*.28);ctx.rotate(prop.rotation);ctx.drawImage(image,-prop.width/2,-height/2,prop.width,height);ctx.restore();}
 },frame:jugglingFrame};
}
