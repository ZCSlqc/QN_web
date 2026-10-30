import attachment from './armAttachment.json';
import joint from './armCircle.json';
import {rigidSide,upperPoint} from './rigidRig';

export function circularArmMatrix(pose,bindings,config,side=1){
  const r=rigidSide(pose,side,bindings),top=attachment.armTop,lower={x:top.x+16.2,y:top.y+82.05};
  const mid={x:(top.x+lower.x)/2,y:(top.y+lower.y)/2},length=Math.hypot(lower.x-top.x,lower.y-top.y);
  const ux=(lower.y-top.y)/length,uy=-(lower.x-top.x)/length,a=2*ux*ux-1,b=2*ux*uy,d=2*uy*uy-1;
  const base=new DOMMatrix().translate(r.shoulder.x,r.shoulder.y).scale(side,1).rotate(r.armAngle*180/Math.PI).translate(-r.arm.sx,-r.arm.sy)
    .translate(top.x,top.y).rotate(config.calibratedAngle||0).translate(-top.x,-top.y);
  const pivot=config.up?lower:top;
  const shoulderAngle=config.shoulder-(config.rest||0);
  let m=base.translate(pivot.x,pivot.y).rotate((config.up?-1:1)*shoulderAngle).translate(-pivot.x,-pivot.y);
  if(config.up)m=m.multiply(new DOMMatrix([a,b,b,d,mid.x-a*mid.x-b*mid.y,mid.y-b*mid.x-d*mid.y]));
  return {base,m,pivot,top,lower,shoulderAngle};
}
export function circularHandFrame(pose,bindings,config,side=1){
  const {m}=circularArmMatrix(pose,bindings,config,side);
  const matrix=m.translate(joint.skin.x,joint.skin.y).rotate(config.bend).translate(-joint.skin.x,-joint.skin.y)
    .translate(attachment.wrist.x,attachment.wrist.y).rotate(attachment.handAngle).translate(-attachment.handPivot.x,-attachment.handPivot.y);
  const palm=new DOMPoint(30.5,35.5).matrixTransform(matrix);
  return {matrix,palm};
}
export function circularMotionHandles(pose,bindings,config,side=1){
  const {base,m,top,lower,shoulderAngle}=circularArmMatrix(pose,bindings,config,side);
  const world=(matrix,p)=>upperPoint(new DOMPoint(p.x,p.y).matrixTransform(matrix),pose,bindings);
  const bend=m.translate(joint.x,joint.y).rotate(config.bend).translate(-joint.x,-joint.y);
  const prefix=side<0?'left':'right';
  const handles={[prefix+'Elbow']:{label:side<0?'左肘':'右肘',side,kind:'elbow',pivot:world(m,joint),tip:world(bend,{x:joint.x+42,y:joint.y}),sign:side*(config.up?-1:1),value:config.bend}};
  for(const up of [false,true]){
    if(up!==config.up&&(Math.abs(shoulderAngle%360)>.001||Math.abs(config.bend%360)>.001))continue;
    const p=up?lower:top,angle=(up?-1:1)*(up===config.up?shoulderAngle:0)*Math.PI/180;
    handles[prefix+(up?'ShoulderLower':'ShoulderUpper')]={label:up?'肩下轴':'肩上轴',kind:'shoulder',side,up,pivot:world(base,p),tip:world(base,{x:p.x+40*Math.cos(angle),y:p.y+40*Math.sin(angle)}),sign:side*(up?-1:1),value:up===config.up?config.shoulder:(config.rest||0)};
  }
  return handles;
}

const colors=new WeakMap();
function colorAt(image,x,y){
  let entries=colors.get(image);if(!entries){entries=new Map();colors.set(image,entries);}
  const key=`${x},${y}`;if(entries.has(key))return entries.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const c=canvas.getContext('2d');c.drawImage(image,-Math.round(x),-Math.round(y));
  const p=c.getImageData(0,0,1,1).data;
  const color=`rgba(${p[0]},${p[1]},${p[2]},${p[3]/255})`;entries.set(key,color);return color;
}

// Each material has its own tangent circle and pivot; rest cut diameters are collinear.
export function drawCircularArm(ctx,r,pose,config,assets,layer){
  const {x:cx,y:cy}=joint.skin,cut=joint.cut*Math.PI/180;
  const top=attachment.armTop,lower={x:top.x+16.2,y:top.y+82.05};
  const mid={x:(top.x+lower.x)/2,y:(top.y+lower.y)/2};
  const length=Math.hypot(lower.x-top.x,lower.y-top.y);
  const ux=(lower.y-top.y)/length,uy=-(lower.x-top.x)/length;
  const a=2*ux*ux-1,b=2*ux*uy,d=2*uy*uy-1;
  ctx.save();ctx.translate(r.shoulder.x,r.shoulder.y);ctx.scale(r.side,1);
  ctx.rotate(r.armAngle);ctx.translate(-r.arm.sx,-r.arm.sy);
  ctx.translate(top.x,top.y);ctx.rotate((config.calibratedAngle||0)*Math.PI/180);ctx.translate(-top.x,-top.y);
  const pivot=config.up?lower:top;
  const shoulder=config.shoulder-(config.rest||0);
  ctx.translate(pivot.x,pivot.y);ctx.rotate((config.up?-1:1)*shoulder*Math.PI/180);ctx.translate(-pivot.x,-pivot.y);
  if(config.up)ctx.transform(a,b,b,d,mid.x-a*mid.x-b*mid.y,mid.y-b*mid.x-d*mid.y);
  function piece(image,sleeve,side){
    if(sleeve&&!assets.sleeve)return;
    const dx=sleeve?attachment.sleeveTop.x-top.x:0,dy=sleeve?attachment.sleeveTop.y-top.y:0;
    const split=sleeve?(side<0?assets.sleeveUpper:assets.sleeveLower):(side<0?assets.armUpper:assets.armLower);
    if(split){ctx.drawImage(split,-dx,-dy);return;}
    // Short sleeves end before the joint and must not grow a circular cuff.
    const covered=!sleeve||config.longSleeve;
    const center=sleeve?joint.sleeve:joint.skin,rad=center.radius,nx=Math.cos(cut),ny=Math.sin(cut),tx=-ny,ty=nx;
    ctx.save();ctx.beginPath();ctx.moveTo(center.x-tx*700,center.y-ty*700);ctx.lineTo(center.x+tx*700,center.y+ty*700);
    ctx.lineTo(center.x+tx*700+side*nx*1400,center.y+ty*700+side*ny*1400);
    ctx.lineTo(center.x-tx*700+side*nx*1400,center.y-ty*700+side*ny*1400);ctx.closePath();
    if(covered){ctx.moveTo(center.x+rad,center.y);ctx.arc(center.x,center.y,rad,0,side===1?-Math.PI*2:Math.PI*2,side===1);}
    ctx.clip();
    if(covered){ctx.fillStyle=colorAt(image,center.x+dx,center.y+dy);ctx.beginPath();ctx.arc(center.x,center.y,rad,0,Math.PI*2);ctx.fill();}
    ctx.drawImage(image,-dx,-dy);ctx.restore();
  }
  if(layer==='back'){if(!config.clothesOnly&&!config.longSleeve)piece(assets.arm,false,-1);piece(assets.sleeve,true,-1);}
  else{
    ctx.save();
    ctx.translate(cx,cy);ctx.rotate(config.bend*Math.PI/180);ctx.translate(-cx,-cy);
    if(!config.clothesOnly&&!config.longSleeve)piece(assets.arm,false,1);
    if(!config.clothesOnly){ctx.save();ctx.translate(r.hand.x,r.hand.y);ctx.rotate(attachment.handAngle*Math.PI/180);
    ctx.drawImage(assets.hand,-r.hand.sx,-r.hand.sy);ctx.restore();}
    ctx.restore();
    ctx.save();ctx.translate(joint.sleeve.x,joint.sleeve.y);ctx.rotate(config.bend*Math.PI/180);ctx.translate(-joint.sleeve.x,-joint.sleeve.y);
    piece(assets.sleeve,true,1);
    ctx.restore();
  }
  ctx.restore();
}
