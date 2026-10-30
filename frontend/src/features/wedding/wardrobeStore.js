import request from '../../utils/request';
import {normalizeAppearance} from './catalog';
import {clothingKeys} from './outfitCatalog';
const accounts=new Map();
const accountKey=profile=>`${profile?.username||''}:${localStorage.getItem('token')||''}`;
function entry(profile){const key=accountKey(profile);if(!accounts.has(key))accounts.set(key,{data:null,etag:'',updated:0,pending:null});return accounts.get(key);}
function receive(state,response){state.data=response.data;state.etag=response.headers?.etag||'';state.updated=Date.now();return state.data;}
export async function loadWardrobe(profile,{signal}={}){
 const state=entry(profile);if(state.data&&Date.now()-state.updated<30000)return state.data;
 if(!state.pending)state.pending=request.get('/wedding/wardrobe',{signal,headers:state.etag?{'If-None-Match':state.etag}:{},validateStatus:status=>status===200||status===304}).then(response=>{
  if(response.status===304){state.updated=Date.now();return state.data;}return receive(state,response);
 }).finally(()=>{state.pending=null;});
 return state.pending;
}
export async function saveAppearance(profile,value){
 const state=entry(profile),appearance=normalizeAppearance(value);
 if(state.data?.appearance&&JSON.stringify(normalizeAppearance(state.data.appearance))===JSON.stringify(appearance))return state.data;
 return receive(state,await request.put('/wedding/wardrobe',{appearance}));
}
export async function saveUserOutfit(profile,name,value){
 const appearance=normalizeAppearance(value),clothes=Object.fromEntries(clothingKeys.map(k=>[k,appearance[k]]));
 return receive(entry(profile),await request.post('/wedding/wardrobe/outfits',{name,appearance:clothes}));
}
export async function removeUserOutfit(profile,id){return receive(entry(profile),await request.delete(`/wedding/wardrobe/outfits/${encodeURIComponent(id)}`));}
