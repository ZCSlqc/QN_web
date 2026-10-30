export const carryMode=item=>!item?'none':item.hands===2||['gifts','meals'].includes(item.category)?'two-hands':'one-hand';
export const heldSide=item=>item?.handSide===-1?-1:1;
export const assignCarryHand=(item,random=Math.random)=>item?{...item,handSide:carryMode(item)==='two-hands'?0:random()<.5?-1:1}:null;

// Item art keeps its aspect ratio. Its supplied grip meets the actual palm,
// rather than a fixed point on the torso. Plates and boxes rest on both palms.
export function heldPlacement(item,image,left,right){
  const two=carryMode(item)==='two-hands',height=(item.suggestedWorldHeight||28)*4;
  const scale=Math.min(height/image.naturalHeight,(two?230:170)/image.naturalWidth)*1.5;
  const width=image.naturalWidth*scale,h=image.naturalHeight*scale;
  const grip=two?{x:(left.x+right.x)/2,y:(left.y+right.y)/2}:heldSide(item)<0?left:right;
  const anchor=item.anchors?.hand||(two?[.5,item.category==='meals'?.91:.86]:[.5,.78]);
  return {x:grip.x-anchor[0]*width,y:grip.y-anchor[1]*h,width,height:h,grip,two,mirrored:item.category==='celebration'&&heldSide(item)<0};
}
