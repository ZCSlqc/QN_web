const valid=new Set(['auto','front','back']);
export function normalizeForearmLayers(value){
  if(typeof value==='string')return {front:valid.has(value)?value:'auto',back:valid.has(value)?value:'auto'};
  return {front:valid.has(value?.front)?value.front:'auto',back:valid.has(value?.back)?value.back:'auto'};
}
export function forearmLayerFor(arm,direction){return normalizeForearmLayers(arm?.forearmLayers)[direction==='back'?'back':'front'];}
export function forearmPass(arm,direction){
  const layer=forearmLayerFor(arm,direction);
  return layer==='back'?'behind':layer==='front'?'above':'front';
}
