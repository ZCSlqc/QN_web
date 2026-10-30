const TAU=Math.PI*2;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const depth=back=>({front:back?'back':'front',back:back?'front':'back'});
export const danceGroups=[{id:'chaos',label:'鬼畜'},{id:'formal',label:'正规'}];
export const danceMoves=[
 {id:'dance-floss',label:'牙线舞',group:'chaos',description:'直臂前后换层，反向顶胯点脚',bpm:120,beats:32,emoji:['emoji-cool','emoji-goofy','emoji-money']},
 {id:'dance-kemusan',label:'科目三',group:'chaos',description:'翻脚换重心，双肘连续转花手',bpm:124,beats:32,emoji:['emoji-cool','emoji-money','emoji-star-eyes']},
 {id:'dance-flash',label:'闪身步',group:'chaos',description:'侧闪、顿步、回身，摇头晃脑',bpm:116,beats:32,emoji:['emoji-goofy','emoji-mind-blown','emoji-wink']},
 {id:'dance-shimmy',label:'抖肩舞',group:'chaos',description:'密集抖肩，两步横移再回头',bpm:128,beats:32,emoji:['emoji-party','emoji-goofy','emoji-cool']},
 {id:'dance-waltz',label:'婚礼圆舞',group:'formal',description:'三拍进退，侧步与舒展手臂',bpm:108,beats:24},
 {id:'dance-tibetan',label:'藏族弦子风格',group:'formal',description:'连步、点地、错拍摆袖',bpm:104,beats:24},
 {id:'dance-mongolian',label:'蒙古族舞风格',group:'formal',description:'肩腰有力，开合步与展臂',bpm:112,beats:32},
 {id:'dance-dai',label:'傣族舒展风格',group:'formal',description:'柔缓错拍抬臂，小侧步轻摆头',bpm:96,beats:24},
].map(move=>({...move,duration:move.beats*60/move.bpm}));
export const initialDance='dance-waltz';
const aliases={dance:'dance-floss','dance-crab':'dance-flash','dance-chicken':'dance-shimmy','dance-sway':'dance-shimmy','dance-step':'dance-kemusan','dance-wave':'dance-mongolian','dance-disco':'dance-shimmy','dance-twist':'dance-flash'};
export const danceFor=id=>danceMoves.find(move=>move.id===(aliases[id]||id));
export function danceEmojiAt(id,time){const d=danceFor(id);return d?.emoji?.[Math.floor(Math.max(0,time)*d.bpm/60/4)%d.emoji.length]||null;}
function motif(id,beat,section){
 const s=Math.sin(beat*Math.PI),c=Math.cos(beat*Math.PI),fast=Math.sin(beat*TAU),slow=Math.sin(beat*Math.PI/2);
 const f={left:{shoulder:35,bend:0},right:{shoulder:35,bend:0},waist:0,head:0,leftLeg:0,rightLeg:0,leftShoe:0,rightShoe:0,x:0};
 if(id==='dance-floss'){
  const reach=section%3===2?17.5:14,behind=Math.floor(beat/2)%2===1;
  f.left={shoulder:17.5+reach*s,bend:0,forearmLayers:depth(behind)};f.right={shoulder:24-reach*1.2*s,bend:0,forearmLayers:depth(!behind)};
  f.waist=-8*s;f.head=5*s;f.x=-12*s;f.leftLeg=-4-14*Math.max(0,s);f.rightLeg=-4-14*Math.max(0,-s);f.leftShoe=-3*s;f.rightShoe=3*s;
 }else if(id==='dance-kemusan'){
  const spinPhase=Math.max(0,Math.min(1,(beat-8)/8)),spin=720*(spinPhase-Math.sin(spinPhase*TAU)/TAU);
  f.leftLeg=-2-20*Math.max(0,slow);f.rightLeg=-2-20*Math.max(0,-slow);f.leftShoe=-4.5*slow;f.rightShoe=4.5*slow;f.waist=9*Math.sin(beat*Math.PI/2-.5);f.head=-7*slow;f.x=10*slow;
  if(section%3===1){f.left={shoulder:16+6*Math.sin(beat*TAU),bend:72+spin};f.right={shoulder:19+6*Math.cos(beat*TAU),bend:72+spin+28*Math.sin(beat*TAU)};}
  else{f.left={shoulder:20+12*s,bend:72+30*c+spin};f.right={shoulder:24-14*s,bend:72-30*c+spin};}
 }else if(id==='dance-flash'){
  const travel=Math.sin(beat*Math.PI/2),snap=Math.tanh(travel*2)/Math.tanh(2);
  f.leftLeg=-3-23*Math.max(0,s);f.rightLeg=-3-23*Math.max(0,-s);f.leftShoe=-3*c;f.rightShoe=3*c;f.waist=7*Math.sin(beat*Math.PI/2-.4);f.head=13*Math.sin(beat*Math.PI/2+.8)+3*fast;f.x=(section%2?35:24)*snap;
  f.left={shoulder:2+2*(1+c),bend:45+6*s};f.right={shoulder:5+2*(1-c),bend:45-6*s};
 }else if(id==='dance-shimmy'){
  const shake=Math.sin(beat*TAU*2),travel=Math.sin(beat*Math.PI/4),reach=section%3===2?12:28;
  f.waist=5*shake;f.head=section%3===2?13*slow:-4*shake;f.x=(section%3===0?5:25)*travel;f.leftLeg=-2-15*Math.max(0,s);f.rightLeg=-2-15*Math.max(0,-s);f.leftShoe=-2*s;f.rightShoe=2*s;
  f.left={shoulder:reach+5*shake,bend:30+10*fast};f.right={shoulder:reach-5*shake,bend:30-10*fast};
 }else if(id==='dance-waltz'){
  const w=beat*TAU/3,turn=Math.sin(w),sweep=Math.sin(w-.6);f.waist=6*turn;f.head=-5*Math.sin(w-.5);f.x=12*Math.sin(w/2);f.leftLeg=-3-12*Math.max(0,turn);f.rightLeg=-3-12*Math.max(0,-turn);f.leftShoe=-2*turn;f.rightShoe=2*turn;
  f.left={shoulder:14+8*sweep,bend:85+22*Math.sin(w-.9)};f.right={shoulder:20-8*sweep,bend:85-22*Math.sin(w-.9)};
 }else if(id==='dance-tibetan'){
  const w=beat*Math.PI/2;f.waist=5*Math.sin(w-.5);f.head=-4*Math.sin(w-.8);f.x=8*Math.sin(w/2);f.leftLeg=-2-18*Math.max(0,Math.sin(w));f.rightLeg=-2-18*Math.max(0,-Math.sin(w));f.leftShoe=-2*s;f.rightShoe=2*s;
  f.left={shoulder:17+13*Math.sin(w),bend:25+20*Math.sin(w-.7)};f.right={shoulder:21-13*Math.sin(w),bend:25-20*Math.sin(w-.7)};
 }else if(id==='dance-mongolian'){
  const w=beat*Math.PI,shoulder=Math.sin(w*2);f.waist=5*Math.sin(w-.4);f.head=-4*Math.sin(w);f.leftLeg=-3-17*Math.max(0,s);f.rightLeg=-3-17*Math.max(0,-s);f.x=7*Math.sin(w/2);
  f.left={shoulder:12+9*shoulder,bend:54+30*Math.sin(w-.5)};f.right={shoulder:16-9*shoulder,bend:54-30*Math.sin(w-.5)};
 }else if(id==='dance-dai'){
  const w=beat*Math.PI/2;f.waist=7*Math.sin(w-1);f.head=-7*Math.sin(w-1.4);f.x=7*Math.sin(w-1);f.leftLeg=-2-11*Math.max(0,Math.sin(w-1));f.rightLeg=-2-11*Math.max(0,-Math.sin(w-1));
  f.left={shoulder:14+11*Math.sin(w),bend:105+28*Math.sin(w-.7)};f.right={shoulder:18-11*Math.sin(w-.5),bend:105+28*Math.sin(w-1.2)};
 }
 return f;
}
export function danceFrame(id,time){
 const dance=danceFor(id)||danceMoves[0],beat=Math.max(0,time)*dance.bpm/60,section=Math.floor(beat/8),blend=smooth(beat%8),current=motif(dance.id,beat,section),previous=motif(dance.id,beat,Math.max(0,section-1));
 for(const key of ['waist','head','leftLeg','rightLeg','leftShoe','rightShoe','x'])current[key]=mix(previous[key],current[key],blend);
 for(const key of ['left','right']){
  for(const angle of ['shoulder','bend'])current[key][angle]=mix(previous[key][angle],current[key][angle],blend);
 }
 return current;
}
