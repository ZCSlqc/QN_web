export const defaultRig = {
  leftShoulder: {x:-62,y:-317}, rightShoulder:{x:62,y:-317},
  leftElbow:{x:-110,y:-247}, rightElbow:{x:110,y:-247},
  leftWrist:{x:-116,y:-175}, rightWrist:{x:116,y:-175},
  neck:{x:0,y:-356},
  leftHip:{x:-30,y:-174}, rightHip:{x:30,y:-174},
  leftAnkle:{x:44,y:139}, rightAnkle:{x:44,y:139},
};
export const rigLabels = {leftShoulder:'左肩',rightShoulder:'右肩',leftElbow:'左肘',rightElbow:'右肘',leftWrist:'左腕',rightWrist:'右腕',neck:'脖子',leftHip:'左腿根',rightHip:'右腿根',leftAnkle:'左脚踝',rightAnkle:'右脚踝'};
export function normalizeRig(value={}) {
  return Object.fromEntries(Object.entries(defaultRig).map(([key,p])=>[key,{
    x:Number.isFinite(value[key]?.x)?Math.max(-600,Math.min(600,value[key].x)):p.x,
    y:Number.isFinite(value[key]?.y)?Math.max(-650,Math.min(300,value[key].y)):p.y,
  }]));
}
export function rigPoint(rig,key) {
  if(!key.endsWith('Ankle')) return rig[key];
  const side=key.startsWith('left')?-1:1,hip=rig[side<0?'leftHip':'rightHip'];
  const a=side*.12,x=side*rig[key].x,y=rig[key].y;
  return {x:hip.x+x*Math.cos(a)-y*Math.sin(a),y:hip.y+x*Math.sin(a)+y*Math.cos(a)};
}
export function localRigPoint(rig,key,p) {
  if(!key.endsWith('Ankle')) return p;
  const side=key.startsWith('left')?-1:1,hip=rig[side<0?'leftHip':'rightHip'];
  const a=side*.12,x=p.x-hip.x,y=p.y-hip.y;
  return {x:side*(x*Math.cos(a)+y*Math.sin(a)),y:-x*Math.sin(a)+y*Math.cos(a)};
}
