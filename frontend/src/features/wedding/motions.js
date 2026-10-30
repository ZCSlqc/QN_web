import {defaultBasePose,defaultBindings} from './rigidRig';
import {normalizeReviewArm} from './reviewPose';
import {jugglerConfiguration} from './juggling';

export const danceMoves=[
 {id:'dance',label:'轻快律动',description:'交替摆臂，跟随节拍'},
 {id:'dance-sway',label:'左右摇摆',description:'肩膀与腰部轻轻摇动'},
 {id:'dance-step',label:'踏步小舞',description:'交替抬脚，轻点节拍'},
 {id:'dance-wave',label:'举手欢庆',description:'双手举起，左右回应'},
 {id:'dance-disco',label:'复古舞步',description:'交替举手，轻快扭腰'},
 {id:'dance-twist',label:'扭扭舞',description:'双臂收拢，身体轻摆'},
];
export const actionDuration=id=>id.startsWith('dance')?6.4:id==='jump'?1.8:id==='clap'?3.2:id==='stretch'?4.5:id==='scratch'?3.3:id==='sway'?4.2:2.6;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function characterMotion(actor,time=0,reduced=false){
 if(actor.kind==='juggler')return jugglerConfiguration(time,reduced);
 const action=actor.gesture||actor.ambientAction||'idle',elapsed=Math.max(0,time-((actor.gesture?actor.gestureStarted:actor.ambientStarted)||0)),duration=actionDuration(action);
 const weight=action==='idle'?1:smooth(elapsed/.24)*smooth((duration-elapsed)/.35),t=reduced?0:elapsed;
 const pose={...defaultBasePose},bindings={...defaultBindings,waist:{...defaultBindings.waist,axis:0}};
 let left={shoulder:35,bend:0},right={shoulder:35,bend:0},waist=0,lift=0;
 const arm=(up,shoulder,bend,side)=>({up,shoulder:shoulder+(side===1?3:0),bend});
 if(actor.walking&&!reduced){
  const pace=clamp(actor.walkPace??1,.2,1),s=Math.sin(time*(2+4*pace)),stride=4+4*pace;
  pose.leftLeg=-1+stride*s;pose.rightLeg=-1-stride*s;pose.leftShoe=-s*2.5;pose.rightShoe=s*2.5;
  left={shoulder:31+4*s,bend:2+2*s};right={shoulder:31-4*s,bend:2-2*s};lift=Math.abs(s)*2;
 }else if(action==='clap'){
  const closed=reduced?1:(1-Math.cos(t*Math.PI*4))/2;
  // Upper arms stay at their downward stops; the forearms alone form an A.
  left={up:false,shoulder:35,bend:157-47*closed};right={up:false,shoulder:35,bend:157-47*closed};
 }else if(action==='stretch'){
  left=arm(true,7+2*Math.sin(t*2),8,-1);right=arm(true,7-2*Math.sin(t*2),8,1);waist=4*Math.sin(t*1.5);pose.head=-7;lift=3;
 }else if(action==='scratch'){
  right={up:false,shoulder:45,bend:32+9*Math.sin(t*8),forearmLayers:{front:'back',back:'front'}};waist=3;pose.head=5;
 }else if(action==='sway'){
  waist=5*Math.sin(t*3);left={shoulder:32,bend:9};right={shoulder:42,bend:9};pose.head=-4*Math.sin(t*3);pose.leftShoe=Math.sin(t*3)*2;pose.rightShoe=-Math.sin(t*3)*2;
 }else if(action==='wave'||action==='bless'){
  left=arm(action==='bless',action==='bless'?5:6,action==='bless'?65:25,-1);
  right=arm(true,6+3*Math.sin(t*5),60+25*Math.sin(t*6),1);pose.head=3*Math.sin(t*3);
 }else if(action.startsWith('dance')){
  const s=Math.sin(t*5),c=Math.cos(t*5),step=Math.sin(t*5+Math.PI/2);
  waist=s*7;pose.leftLeg=-1+7*s;pose.rightLeg=-1-7*s;pose.leftShoe=-3*s;pose.rightShoe=3*s;pose.head=-s*5;lift=Math.abs(s)*5;
  if(action==='dance-sway'){left=arm(false,18+10*s,50+15*c,-1);right=arm(false,18-10*s,50-15*c,1);}
  else if(action==='dance-wave'){left=arm(true,5+4*s,50+25*c,-1);right=arm(true,5-4*s,50-25*c,1);}
  else if(action==='dance-disco'){left=arm(s>0,5+4*c,s>0?35:95,-1);right=arm(s<=0,5-4*c,s<=0?35:95,1);}
  else if(action==='dance-step'){left=arm(false,17+12*c,40+20*s,-1);right=arm(false,17-12*c,40-20*s,1);pose.leftLeg=-1+10*step;pose.rightLeg=-1-10*step;lift=Math.abs(s)*9;}
  else if(action==='dance-twist'){left=arm(false,30,90+18*s,-1);right=arm(false,30,90-18*s,1);waist=s*9;}
  else {left=arm(false,17+13*s,30+25*c,-1);right=arm(false,17-13*s,30-25*c,1);}
 }else if(action==='jump'){
  const flight=smooth((t-.28)/.18)*(1-smooth((t-1.15)/.25));
  lift=reduced?0:Math.max(0,Math.sin(clamp((t-.25)/1.15,0,1)*Math.PI))*85;
  left=arm(flight>.5,flight>.5?6:20,flight>.5?35:70,-1);right=arm(flight>.5,flight>.5?6:20,flight>.5?35:70,1);
  pose.leftLeg=-flight*9;pose.rightLeg=-flight*9;pose.leftShoe=flight*3;pose.rightShoe=flight*3;
 }
 if(reduced){lift=0;waist=0;left={shoulder:35,bend:0};right={shoulder:35,bend:0};}
 const holding=actor.heldItem&&!actor.gesture;
 if(holding){
  const category=actor.heldItem.category,two=category==='gifts'||category==='meals';
  const depth={front:'front',back:'back'};
  if(two){left={shoulder:35,bend:110,forearmLayers:depth};right={shoulder:35,bend:110,forearmLayers:depth};}
  else right={shoulder:35,bend:category==='flowers'?85:category==='balloons'?20:105,forearmLayers:depth};
 }
 for(const key of ['leftLeg','rightLeg','leftShoe','rightShoe'])pose[key]*=weight;
 pose.head=clamp(pose.head*weight,-20,20);waist*=weight;bindings.waist.axis=waist<0?1:0;pose.waist=waist;
 function finish(a,side){const rest=a.up?(side===1?3:0):35,w=holding?1:weight;return normalizeReviewArm({...a,shoulder:rest+((a.shoulder||0)-rest)*w,bend:(a.bend||0)*w},false,side);}
 const blink=reduced?1:(time%4.1>3.96?.12:1);
 return {rigidPose:pose,rigidBindings:bindings,leftCircularArm:finish(left,-1),circularArm:finish(right,1),lift:lift*weight,shadowScale:1-clamp(lift/200,0,.35),facePose:{eyeOpen:blink,mouthScale:action.startsWith('dance')?1.04:1},motionName:action,holding:!!holding};
}
