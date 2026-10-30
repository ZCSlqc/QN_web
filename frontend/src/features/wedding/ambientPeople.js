import {actionDuration} from './motions';
export const hiddenActions=['rest','blink','shift','look','nod','head-shake','cuff','head-scratch','toe-tap','slow-walk','greet','chat'];
// Local, independent clocks. Quiet gestures dominate; explicit player input wins.
export function createAmbientPeople(actors,player,routeFor){
 const states=new Map(actors.map((a,i)=>[a,{anchor:{x:a.x,y:a.y},next:700+i*431+Math.random()*2200,until:0,route:[],speed:(a.persona==='calm-girl'?.7:a.persona==='lively-boy'?1.2:1)*(10+Math.random()*7)}]));
 let lastInput=0;const idleDelay=player.persona==='calm-girl'?22000:player.persona==='lively-boy'?13000:18000;
 function interrupt(time){lastInput=time;player.ambientAction='';player.ambientDuration=0;const s=states.get(player);s.route=[];s.anchor={x:player.x,y:player.y};s.next=time+idleDelay;player.walking=false;player.walkPace=1;}
 function update(dt,time,reduced,playerBusy,isVisible=()=>true){
  if(reduced)return false;let active=false;const obstacles=actors.filter(a=>a===player||isVisible(a));
  for(const actor of actors){const s=states.get(actor);
   if(actor!==player&&!isVisible(actor))continue;
   if(actor===player&&(playerBusy||actor.gesture||time-lastInput<idleDelay)){actor.ambientAction='';continue;}
   if(s.route.length){
    const next=s.route[0],dx=next.x-actor.x,dy=next.y-actor.y,d=Math.hypot(dx,dy),step=Math.min(d,s.speed*dt),p={x:actor.x+dx/(d||1)*step,y:actor.y+dy/(d||1)*step};
    const blocked=obstacles.some(other=>other!==actor&&Math.hypot(p.x-other.x,p.y-other.y)<30&&Math.hypot(p.x-other.x,p.y-other.y)<Math.hypot(actor.x-other.x,actor.y-other.y));
    if(!blocked){actor.x=p.x;actor.y=p.y;}actor.walking=!blocked;actor.walkPace=.25;actor.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';
    if(d<2)s.route.shift();if(time>=s.until)s.route=[];active=true;if(s.route.length)continue;actor.walking=false;s.next=time+2500+Math.random()*4500;
   }
   if(actor.ambientAction){active=true;if(time<s.until)continue;actor.ambientAction='';s.next=time+(actor.kind==='florist'?6500:2500)+Math.random()*5500;}
   if(time<s.next)continue;
   const quiet=actor.kind==='florist'?['rest','rest','rest','rest','blink','nod']:['rest','rest','rest','blink','shift','look','nod','head-shake'];
   const extra=actor.kind==='florist'?['collar','nod']:actor.persona==='calm-girl'?['cuff','greet']:actor.persona==='lively-boy'?['toe-tap','head-scratch','greet','chat','slow-walk']:['cuff','head-scratch','toe-tap','greet','chat','slow-walk'];
   const options=[...quiet,...extra],action=options[Math.floor(Math.random()*options.length)];s.next=time+5000;
   if(action==='slow-walk'){
    if(actor.kind)continue;
    const radius=actor===player?55:100,target={x:s.anchor.x+(Math.random()-.5)*radius,y:s.anchor.y+(Math.random()-.5)*radius*.65};
    if(obstacles.some(a=>a!==actor&&Math.hypot(a.x-target.x,a.y-target.y)<38))continue;
    const route=routeFor(actor,target);if(route?.length){s.route=route;s.until=time+5000+Math.random()*3000;actor.ambientAction='';}continue;
   }
   if(action==='chat'||action==='greet'){
    const peer=obstacles.filter(other=>other!==actor&&Math.hypot(other.x-actor.x,other.y-actor.y)<170).sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0];
    if(peer){actor.direction=peer.y<actor.y-20?'back':'front';if(action==='chat'&&peer!==player&&!peer.gesture&&!peer.walking&&states.has(peer)){peer.ambientAction='nod';peer.ambientStarted=time/1000;peer.ambientDuration=actionDuration('nod');states.get(peer).until=time+3000;}}
   }
   actor.ambientAction=action;actor.ambientStarted=time/1000;actor.ambientDuration=actionDuration(action);s.until=time+actor.ambientDuration*1000;active=true;
  }return active;
 }
 return {update,interrupt};
}
