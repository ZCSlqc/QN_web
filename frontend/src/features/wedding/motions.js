import {defaultBasePose,defaultBindings,legOuterLimit,legInnerTravel} from './rigidRig';
import {normalizeReviewArm} from './reviewPose';
import {jugglerConfiguration} from './juggling';
import {danceMoves,danceFor,danceFrame} from './choreography';
import {jumpFrame,jumpDuration} from './jumpPhysics';
import {groundedOffset} from './grounding';
import {dailyMoves,dailyFrame,ambientDurations,forearmDirection} from './dailyMotions';
import {carryMode,heldSide} from './heldItems';

export {danceMoves};
export const actionDuration=id=>danceFor(id)?.duration??(id==='jump'?jumpDuration:dailyMoves.find(m=>m.id===id)?.duration??ambientDurations[id]??(id==='clap'?3.2:id==='bless'?3.4:2.6));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function characterMotion(actor,time=0,reduced=false){
 if(actor.kind==='juggler')return jugglerConfiguration(time,reduced);
 const action=actor.gesture||actor.ambientAction||'idle',elapsed=Math.max(0,time-((actor.gesture?actor.gestureStarted:actor.ambientStarted)||0)),duration=(!actor.gesture&&actor.ambientDuration)||actionDuration(action),dancing=!!danceFor(action);
 const weight=action==='idle'||action==='jump'||action==='stretch'?1:smooth(elapsed/(dancing ? .65 : .24))*smooth((duration-elapsed)/(dancing ? .85 : .35)),t=reduced?0:elapsed;
 const pose={...defaultBasePose},bindings={...defaultBindings,waist:{...defaultBindings.waist,axis:0},leftLeg:{...defaultBindings.leftLeg},rightLeg:{...defaultBindings.rightLeg}};
 let left={shoulder:35,bend:0},right={shoulder:35,bend:0},waist=0,lift=0,bodyX=0,jump=null;
 if(actor.walking&&!reduced){
  const pace=clamp(actor.walkPace??1,.2,1),s=Math.sin(time*(2+4*pace)),stride=4+4*pace;
  pose.leftLeg=-1+stride*s;pose.rightLeg=-1-stride*s;pose.leftShoe=-s*2.5;pose.rightShoe=s*2.5;
  left={shoulder:31+4*s,bend:2+2*s};right={shoulder:31-4*s,bend:2-2*s};
 }else if(action==='clap'){
  const closed=reduced?1:(1-Math.cos(t*Math.PI*4))/2;
  // Upper arms stay at their downward stops; the forearms alone form an A.
  left={up:false,shoulder:35,bend:157-47*closed};right={up:false,shoulder:35,bend:157-47*closed};
 }else if(action==='stretch'){
  // Reach the reviewed neutral hinge before switching to the upward branch.
  const up=t>=.65&&t<3.85,reach=smooth((t-.65)/.65)*(1-smooth((t-3.2)/.65)),neutral=smooth(t/.65)*(1-smooth((t-3.85)/.65));
  left={up,shoulder:up?8*reach:35*(1-neutral),bend:up?10*reach:0};
  right={up,shoulder:up?3+8*reach:35-32*neutral,bend:up?10*reach:0};
  waist=3*Math.sin(t*1.5)*reach;pose.head=defaultBasePose.head-8*reach;
 }else if(action==='scratch'){
  const stroke=Math.sin(t*Math.PI*3),reach=smooth(t/.55)*(1-smooth((t-2.4)/.55));
  right={up:false,shoulder:45,bend:28+7*stroke*reach,forearmLayers:{front:'back',back:'front'}};waist=3*reach;pose.head=6*reach;
 }else if(action==='bless'){
   const gather=smooth(t/.65),offer=smooth((t-.8)/.9);
   left={shoulder:35-13*gather+6*offer,bend:105*gather-40*offer};right={shoulder:35-10*gather+6*offer,bend:105*gather-40*offer};pose.head=-2*gather+3*offer;
 }else if(dancing){
  const frame=danceFrame(action,t);left=frame.left;right=frame.right;waist=frame.waist;pose.head=frame.head;bodyX=frame.x;
  for(const key of ['leftLeg','rightLeg','leftShoe','rightShoe'])pose[key]=frame[key];
 }else if(action==='jump'){
  jump=jumpFrame(t);lift=jump.height;
  left={shoulder:jump.shoulder,bend:jump.bend};right={shoulder:jump.shoulder,bend:jump.bend};
  pose.leftLeg=pose.rightLeg=jump.leg;pose.leftShoe=pose.rightShoe=jump.shoe;
 }else if(dailyMoves.some(m=>m.id===action)||ambientDurations[action]){
  const frame=dailyFrame(action,t);left=frame.left;right=frame.right;waist=frame.waist;pose.head=frame.head;bodyX=frame.x;for(const key of ['leftLeg','rightLeg','leftShoe','rightShoe'])pose[key]=frame[key];
 }
 if(reduced){lift=0;waist=0;bodyX=0;left={shoulder:35,bend:0};right={shoulder:35,bend:0};for(const key of ['head','leftLeg','rightLeg','leftShoe','rightShoe'])pose[key]=defaultBasePose[key];}
 const holding=actor.heldItem&&!actor.gesture;
 if(holding){
  const category=actor.heldItem.category,two=carryMode(actor.heldItem)==='two-hands';
  const depth={front:'front',back:'back'};
  if(two){left={shoulder:35,bend:110,forearmLayers:depth};right={shoulder:35,bend:110,forearmLayers:depth};}
  else{
   const balloon=category==='balloons',popper=category==='celebration',side=heldSide(actor.heldItem);
   const arm={up:balloon,shoulder:balloon?(side<0?6:9):popper?16:35,bend:balloon?10:popper?350-14-forearmDirection:category==='flowers'?85:105,forearmLayers:depth};
   if(heldSide(actor.heldItem)<0)left=arm;else right=arm;
  }
 }
 for(const key of ['leftLeg','rightLeg','leftShoe','rightShoe'])pose[key]*=weight;
 for(const key of ['leftLeg','rightLeg']){pose[key]=clamp(pose[key],legOuterLimit-legInnerTravel,9);bindings[key].axis=pose[key]<legOuterLimit?'inner':'outer';bindings[key].pivotStyle=actor.appearance?.bottomStyle||actor.appearance?.leg==='none'?'long':actor.appearance?.leg||'long';}
 pose.head=clamp(defaultBasePose.head+(pose.head-defaultBasePose.head)*weight,-20,20);waist*=weight;bindings.waist.axis=waist<0?1:0;pose.waist=waist;
 if(!reduced&&Number.isFinite(actor.emotionStarted)){const e=Math.max(0,time-actor.emotionStarted),fade=smooth(e/.4);pose.head=clamp(pose.head+Math.sin(e*3)*5*fade,-20,20);}
 function finish(a,side){const rest=a.up?(side===1?3:0):35,w=holding?1:weight,turns=action==='flower'||danceFor(action)?.id==='dance-kemusan'?Math.round((a.bend||0)/360)*360:0;return normalizeReviewArm({...a,shoulder:rest+((a.shoulder||0)-rest)*w,bend:turns+((a.bend||0)-turns)*w},false,side);}
 const blink=reduced?1:action==='blink'?(t%1.2>.92?.12:1):(time%4.1>3.96?.12:1);
 const bodyOffset={x:bodyX*weight||0,y:!reduced&&!(jump?.height>0)?groundedOffset(pose,bindings,actor.appearance?.shoes):0};
 return {rigidPose:pose,rigidBindings:bindings,leftCircularArm:finish(left,-1),circularArm:finish(right,1),bodyOffset,lift:action==='jump'?lift:lift*weight,shadowScale:1-clamp(lift/200,0,.35),jumpPhase:reduced?'idle':jump?.phase||'idle',verticalVelocity:reduced?0:jump?.velocity||0,facePose:{eyeOpen:blink,mouthScale:dancing?1+.06*Math.sin(t*4):1},motionName:action,holding:!!holding};
}
