import {defaultBasePose,defaultPose,normalizePose,rangeFor} from './rigidRig';
import {normalizeForearmLayers} from './armOcclusion';

export const reviewLabels={head:'头部',waist:'腰部',leftShoulder:'左肩',rightShoulder:'右肩',leftElbow:'左肘',rightElbow:'右肘',leftLeg:'左腿',rightLeg:'右腿',leftShoe:'左鞋',rightShoe:'右鞋'};
export const defaultArm={enabled:true,up:false,shoulder:0,bend:0,rest:0,calibratedAngle:0};
export const wrapAngle=value=>((value+180)%360+360)%360-180;
export function reviewRange(key,{free=false,up=false,axis=0}={}){
  if(key.endsWith('Elbow'))return free?null:{min:0,max:up?100:160};
  if(free)return {min:-180,max:180};
  if(key==='rightShoulder')return {min:3,max:up?13:45};
  if(key==='leftShoulder')return {min:0,max:up?10:35};
  return rangeFor(key,axis);
}
export function clampReviewAngle(value,range){
  const number=Number(value);if(!Number.isFinite(number))return 0;
  return range?Math.max(range.min,Math.min(range.max,number)):number;
}
export function normalizeReviewArm(value={},free=false,side=1){
  const up=value.up===true,rest=side===1?3:0,prefix=side===1?'right':'left';
  const shoulder=Number.isFinite(value.shoulder)?value.shoulder:rest;
  return {...defaultArm,up,rest,calibratedAngle:rest,shoulder:clampReviewAngle(shoulder,reviewRange(prefix+'Shoulder',{free,up})),bend:clampReviewAngle(value.bend,reviewRange(prefix+'Elbow',{free,up})),forearmLayers:normalizeForearmLayers(value.forearmLayers)};
}
export function normalizeReviewBase(value=defaultBasePose){return normalizePose(value,true);}
export function normalizeReviewPose(value={},free=false,axis=0,base=defaultBasePose){
  return Object.fromEntries(Object.keys(defaultPose).map(key=>{
    if(key.endsWith('Hand'))return [key,0];
    // Old arm offsets remain part of the reviewed baseline; shoulder motion
    // now belongs to each arm's own dual-anchor control.
    if(key.endsWith('Arm'))return [key,clampReviewAngle(value[key],{min:-180,max:180})];
    if(key==='waist')return [key,clampReviewAngle((Number(value[key])||0)+(base.waist||0),reviewRange(key,{free,axis}))-(base.waist||0)];
    return [key,clampReviewAngle(value[key],reviewRange(key,{free,axis}))];
  }));
}
