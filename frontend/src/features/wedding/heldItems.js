export const carryMode=item=>!item?'none':['gifts','meals'].includes(item.category)?'two-hands':'one-hand';

// Item art keeps its aspect ratio. Its supplied grip meets the actual palm,
// rather than a fixed point on the torso. Plates and boxes rest on both palms.
export function heldPlacement(item,image,left,right){
  const two=carryMode(item)==='two-hands',height=(item.suggestedWorldHeight||28)*4;
  const scale=Math.min(height/image.naturalHeight,(two?230:170)/image.naturalWidth);
  const width=image.naturalWidth*scale,h=image.naturalHeight*scale;
  const grip=two?{x:(left.x+right.x)/2,y:(left.y+right.y)/2}:right;
  const anchor=two?[.5,item.category==='meals'?.91:.86]:(item.anchors?.hand||[.5,.78]);
  return {x:grip.x-anchor[0]*width,y:grip.y-anchor[1]*h,width,height:h,grip,two};
}
