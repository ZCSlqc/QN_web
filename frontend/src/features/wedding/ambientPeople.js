// Each person owns their timing, pose, and short route; no group-wide timer.
export function createAmbientPeople(actors,player,routeFor){
 const states=new Map(actors.map((a,i)=>[a,{anchor:{x:a.x,y:a.y},next:700+i*431+Math.random()*1800,until:0,route:[],speed:(a.persona==='calm-girl'?.7:a.persona==='lively-boy'?1.2:1)*(10+Math.random()*7)}]));
 let lastInput=0;
 const idleDelay=player.persona==='calm-girl'?18000:player.persona==='lively-boy'?9000:12000;
 function interrupt(time){lastInput=time;player.ambientAction='';const s=states.get(player);s.route=[];s.next=time+idleDelay;}
 function update(dt,time,reduced,playerBusy,isVisible=()=>true){
  if(reduced)return false;let active=false;
  const obstacles=actors.filter(a=>a===player||isVisible(a));
  for(const actor of actors){const s=states.get(actor);
   if(actor!==player&&!isVisible(actor))continue;
   if(actor===player&&(playerBusy||actor.gesture||time-lastInput<idleDelay)){actor.ambientAction='';continue;}
   if(s.route.length){
    const next=s.route[0],dx=next.x-actor.x,dy=next.y-actor.y,d=Math.hypot(dx,dy),step=Math.min(d,s.speed*dt),p={x:actor.x+dx/(d||1)*step,y:actor.y+dy/(d||1)*step};
    const blocked=obstacles.some(other=>other!==actor&&Math.hypot(p.x-other.x,p.y-other.y)<30&&Math.hypot(p.x-other.x,p.y-other.y)<Math.hypot(actor.x-other.x,actor.y-other.y));
    if(!blocked){actor.x=p.x;actor.y=p.y;}actor.walking=!blocked;actor.walkPace=.25;actor.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';
    if(d<2)s.route.shift();if(time>=s.until)s.route=[];active=true;if(s.route.length)continue;actor.walking=false;s.next=time+1500+Math.random()*2200;
   }
   if(actor.ambientAction){active=true;if(time<s.until)continue;actor.ambientAction='';s.next=time+1300+Math.random()*3200;}
   if(time<s.next)continue;
   const options=actor.persona==='calm-girl'?['sway','sway','wave']:actor.persona==='lively-boy'?['stretch','wave','wave','sway',...(actor===player?[]:['slow-walk'])]:actor===player?['stretch','scratch','sway','wave']:actor.kind?['stretch','sway','wave']:['stretch','scratch','sway','wave','slow-walk','slow-walk'];
   const action=options[Math.floor(Math.random()*options.length)];s.next=time+5000;
   if(action==='slow-walk'){
    const target={x:s.anchor.x+(Math.random()-.5)*135,y:s.anchor.y+(Math.random()-.5)*90};
    if(obstacles.some(a=>a!==actor&&Math.hypot(a.x-target.x,a.y-target.y)<38))continue;
    const route=routeFor(actor,target);if(route?.length){s.route=route;s.until=time+6500+Math.random()*3500;actor.ambientAction='';}continue;
   }
   actor.ambientAction=action;actor.ambientStarted=time/1000;s.until=time+(action==='stretch'?4500:action==='scratch'?3300:action==='sway'?4200:2600);active=true;
  }return active;
 }
 return {update,interrupt};
}
