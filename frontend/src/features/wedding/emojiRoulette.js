export const rouletteDuration=2500;
// Slow down the changes towards the end; candidates are decoded before starting.
export function rouletteIndex(elapsed,count){const p=Math.max(0,Math.min(1,elapsed/rouletteDuration));return Math.min(11,Math.floor(12*(1-(1-p)**2)))%count;}
export function rouletteCandidates(heads,random=Math.random){
 const final=heads[Math.floor(random()*heads.length)],others=heads.filter(h=>h.id!==final.id);
 for(let i=others.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
 return {final,candidates:[...others.slice(0,5),final]};
}
