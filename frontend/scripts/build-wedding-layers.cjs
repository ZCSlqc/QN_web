const { writeAsset } = require('./asset-files.cjs');
// Full-scene transparent overlays. Placement always uses the same 1600x900 world.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..');
async function main(){
 const base='wedding/background/layers';
 const folder=path.join(root,'asset',base);
 const reference=await sharp(path.join(root,'asset/wedding/background/garden-orthographic.webp')).metadata();
 const layers=[];
 for(const id of ['foreground','table-left','table-right']){
  const input=path.join(folder,'sources',`${id}.webp`),meta=await sharp(input).metadata();
  if(!meta.hasAlpha)throw Error(`${id}: missing alpha`);
  if(Math.abs(meta.width/meta.height-reference.width/reference.height)>.08)throw Error(`${id}: canvas aspect ratio differs from reference`);
  const file=`${id}.webp`;
  if(id.startsWith('table-')) {
    const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let l=info.width,t=info.height,r=0,b=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
    // Registration against the original 1672x941 scene, preserving aspect ratio.
    const target=id==='table-left'?{x:38,y:282,w:162,h:180}:{x:1516,y:348,w:156,h:207};
    const {data:cut,info:size}=await sharp(input).extract({left:l,top:t,width:r-l+1,height:b-t+1})
      .resize({width:target.w,height:target.h,fit:'inside'}).png().toBuffer({resolveWithObject:true});
    await sharp({create:{width:reference.width,height:reference.height,channels:4,background:'#00000000'}})
      .composite([{input:cut,left:target.x+(id==='table-right'?target.w-size.width:0),top:target.y+target.h-size.height}])
      .webp({quality:94,alphaQuality:100}).toFile(path.join(folder,file));
  } else {
  await sharp(input).resize(reference.width,reference.height,{fit:'fill'}).webp({quality:94,alphaQuality:100}).toFile(path.join(folder,file));
  }
  const {data,info}=await sharp(path.join(folder,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=info.width,t=info.height,r=-1,b=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;
   if(a>16){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
  }
  if(r<l||transparent<info.width*info.height*.5)throw Error(`${id}: expected isolated overlay with mostly transparent canvas`);
  const rel=`${base}/${file}`;
  layers.push({id,image:`/${rel}`,width:reference.width,height:reference.height,world:{x:0,y:0,width:1600,height:900},alphaBounds:{x:l,y:t,width:r-l+1,height:b-t+1},status:'extracted-preview'});
 }
 const catalog={reference:'/wedding/background/garden-orthographic.webp',notes:'Generated extractions: full-canvas alignment is approximate and requires overlay review before integration. Original background still contains these objects; clean plate is not yet made.',layers};
 writeAsset(path.join(folder,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 console.log('Built 3 preview layers in asset/; unpublished until integrated into the scene.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
