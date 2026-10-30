import {defaultBasePose,defaultBindings,rigidSide} from './rigidRig';
import legAttachment from './legAttachment.json';

// All current shoe assets use a 94×42 native canvas (including formal shoes).
// Use the rotated sole bounds to keep the support foot on its resting plane.
function shoeType(shoe){const type=Number(shoe.match(/(\d+)$/)?.[1])||1;return legAttachment.shoes[type]?type:1;}
export function soleHeight(pose,bindings=defaultBindings,shoe=''){
 const anchor=legAttachment.shoes[shoeType(shoe)];
 return Math.max(...[-1,1].map(side=>{
  const r=rigidSide(pose,side,bindings),a=(pose[r.prefix+'Leg']+pose[r.prefix+'Shoe'])*Math.PI/180;
  return r.ankle.y+Math.max(-anchor.x*Math.sin(a),(94-anchor.x)*Math.sin(a))+(42-anchor.y)*Math.cos(a);
 }));
}
const restingSoles=Object.fromEntries(Object.keys(legAttachment.shoes).map(id=>[id,soleHeight(defaultBasePose,defaultBindings,id)]));
export const groundedOffset=(pose,bindings,shoe='')=>restingSoles[shoeType(shoe)]-soleHeight(pose,bindings,shoe);
