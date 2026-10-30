import catalog from '../../../../asset/wedding/original/catalog.json';
export const originalArt=catalog.items;
export const originalItem=id=>originalArt.find(item=>item.id===id);
export const originalUrl=id=>originalItem(id).image;
const loading=new Map();
export async function loadOriginalImages(ids){return new Map(await Promise.all(ids.map(async id=>{
 if(!loading.has(id)){const image=new Image();image.src=originalUrl(id);loading.set(id,image.decode().then(()=>image).catch(error=>{loading.delete(id);throw error;}));}
 return [id,await loading.get(id)];
})));}
