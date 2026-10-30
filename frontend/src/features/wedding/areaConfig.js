import original from './walkable-area.json' with {type:'json'};

export const defaultArea=()=>structuredClone(original);
export const AREA_DRAFT_KEY='wedding-walkable-draft-v1';
import {areaError} from './areaGeometry.js';
export {areaError};
export function parseArea(text){
 const area=JSON.parse(text),error=areaError(area);
 if(error)throw Error(error);
 // Keep the configured scene image; JSON imports contain geometry only.
 return {...defaultArea(),width:area.width,height:area.height,world:{width:area.world.width,height:area.world.height},points:area.points.map(p=>[...p])};
}
