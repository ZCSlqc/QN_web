const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
import attachment from './armAttachment.json';
import joint from './armCircle.json';
const handAngle=attachment.handAngle*Math.PI/180,dx=30.5-attachment.handPivot.x,dy=35.5-attachment.handPivot.y;
const palmVector={x:attachment.wrist.x+dx*Math.cos(handAngle)-dy*Math.sin(handAngle)-joint.skin.x,y:attachment.wrist.y+dx*Math.sin(handAngle)+dy*Math.cos(handAngle)-joint.skin.y};
export const forearmDirection=Math.atan2(palmVector.y,palmVector.x)*180/Math.PI;
export const dailyGroups=[{id:'serious',label:'正经'},{id:'playful',label:'搞怪'}];
export const dailyMoves=[
 {id:'wave',icon:'👋',label:'挥手招呼',group:'serious',duration:4.1,description:'抬手、挥两次、点头再放下'},
 {id:'stretch',icon:'🙆',label:'伸个懒腰',group:'serious',duration:4.5,description:'抬臂舒展，停一停再收回'},
 {id:'nod',icon:'🙂',label:'点头致意',group:'serious',duration:3,description:'看向前方，轻轻点头致意'},
 {id:'collar',icon:'👔',label:'整理衣领',group:'serious',duration:3.8,description:'理一理领口，放下双手'},
 {id:'scratch',icon:'🙈',label:'摸摸屁股',group:'playful',duration:3.3,description:'绕到身后摸两下，若无其事'},
 {id:'flower',icon:'🌀',label:'花手整活',group:'playful',duration:5.8,description:'双肘错拍绕圈，渐快再收势'},
 {id:'sway',icon:'😎',label:'嘚瑟摆胯',group:'playful',duration:4.8,description:'叉腰、换重心，脚尖轻点'},
 {id:'jump',icon:'🐇',label:'开心小跳',group:'playful',description:'摆臂跃起，再稳稳落地'},
];
export const ambientDurations={rest:4.8,blink:2.5,shift:3.6,look:3.4,'head-shake':3.2,cuff:3.6,'head-scratch':3.5,'toe-tap':3.8,greet:4.1,chat:4.8};
export function dailyFrame(id,t){
 const f={left:{shoulder:35,bend:0},right:{shoulder:35,bend:0},waist:0,head:-1,leftLeg:0,rightLeg:0,leftShoe:0,rightShoe:0,x:0};
 if(id==='wave'||id==='greet'){
  const reach=smooth(t/.75)*(1-smooth((t-2.9)/.8)),wave=Math.sin(Math.max(0,t-.8)*Math.PI*2)*smooth((t-.8)/.25)*(1-smooth((t-2.6)/.3));
  const shoulder=35-23*reach+3*wave,upright=270-(shoulder-2)-forearmDirection;
  f.right={shoulder,bend:upright*reach+11*wave};f.head=3*Math.sin(t*2)*reach;
 }else if(id==='nod')f.head=-1+7*Math.sin(t*Math.PI)*smooth(t/.5)*(1-smooth((t-2.1)/.5));
 else if(id==='collar'||id==='cuff'){
  const reach=smooth(t/.8)*(1-smooth((t-2.6)/.7)),adjust=Math.sin(t*8)*3*reach;f.left={shoulder:35-13*reach,bend:(id==='cuff'?105:143)*reach+adjust};f.right={shoulder:35-10*reach,bend:(id==='cuff'?80:143)*reach-adjust};f.head=3*reach;
 }else if(id==='flower'){
  const turnTime=Math.max(0,Math.min(3.6,t-.8)),turns=turnTime/3.6,angle=720*(turns-Math.sin(turns*Math.PI*2)/(Math.PI*2)),reach=smooth(t/.8)*(1-smooth((t-4.4)/.9));
  f.left={shoulder:35-17*reach,bend:72*reach+angle};f.right={shoulder:35-14*reach,bend:72*reach+angle+25*Math.sin(t*4)*reach};f.head=4*Math.sin(t*3)*reach;
 }else if(id==='sway'){
  const rock=Math.sin(t*Math.PI),reach=smooth(t/.6)*(1-smooth((t-3.7)/.7));f.waist=8*rock*reach;f.head=-5*rock*reach;f.left={shoulder:35,bend:75*reach};f.right={shoulder:40,bend:75*reach};f.leftLeg=-3-16*Math.max(0,rock)*reach;f.rightLeg=-3-16*Math.max(0,-rock)*reach;f.leftShoe=-3*rock*reach;f.rightShoe=3*rock*reach;f.x=-8*rock*reach;
 }else if(id==='shift'||id==='rest'){const s=Math.sin(t*1.3);f.waist=(id==='rest'?1:2)*s;f.head=-1-s;f.leftShoe=s;f.rightShoe=-s;}
 else if(id==='look'){f.head=8*Math.sin(t*1.8);f.waist=-2*Math.sin(t*1.8);}
 else if(id==='head-shake')f.head=-1+5*Math.sin(t*4)*smooth(t/.5)*(1-smooth((t-2.2)/.6));
 else if(id==='head-scratch'){f.right={shoulder:8,bend:151+4*Math.sin(t*7)};f.head=-5;}
 else if(id==='toe-tap'){const tap=(1-Math.cos(t*6))/2;f.rightLeg=-4-13*tap;f.rightShoe=3*tap;f.waist=-2;}
 else if(id==='chat'){f.right={shoulder:25,bend:55+10*Math.sin(t*3)};f.head=4*Math.sin(t*2);}
 return f;
}
