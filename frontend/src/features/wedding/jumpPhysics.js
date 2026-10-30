const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// 330 source pixels ≈ 1 metre. Gravity is 9.81 m/s²; takeoff is 2.32 m/s.
// The character, its clothes and its attachments are never scaled to fake a crouch.
export const jumpPhysics=Object.freeze({gravity:9.81*330,launchSpeed:2.32*330,takeoff:.32,recovery:.34});
export const jumpFlightTime=2*jumpPhysics.launchSpeed/jumpPhysics.gravity;
export const jumpDuration=jumpPhysics.takeoff+jumpFlightTime+jumpPhysics.recovery;

export function jumpFrame(time){
 const {gravity,launchSpeed,takeoff,recovery}=jumpPhysics,flight=time-takeoff,landing=takeoff+jumpFlightTime;
 if(time<takeoff){const windup=smooth(time/(takeoff*.7)),push=smooth((time-takeoff*.7)/(takeoff*.3));return {phase:'prepare',height:0,velocity:0,leg:8*windup*(1-push),shoe:-5*windup*(1-push),shoulder:35-12*windup,bend:35*windup};}
 if(time<landing){const progress=flight/jumpFlightTime,tuck=Math.sin(progress*Math.PI),swing=smooth(progress/.35);return {phase:progress<.5?'rising':'falling',height:Math.max(0,launchSpeed*flight-gravity*flight*flight/2),velocity:launchSpeed-gravity*flight,leg:-6*tuck,shoe:3*tuck,shoulder:23-17*swing,bend:35+30*tuck};}
 if(time<landing+recovery){const p=(time-landing)/recovery,absorb=Math.sin(Math.PI*smooth(p)),settle=smooth(p);return {phase:'land',height:0,velocity:0,leg:8*absorb,shoe:-5*absorb,shoulder:6+29*settle,bend:35*(1-settle)};}
 return {phase:'idle',height:0,velocity:0,leg:0,shoe:0,shoulder:35,bend:0};
}
