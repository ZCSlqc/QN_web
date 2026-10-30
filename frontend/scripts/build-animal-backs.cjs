const { writeAsset, copyAsset } = require('./asset-files.cjs');
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..');
const ids=['bear','chick','chicken','fox','frog','monkey','pig','rabbit','tabby-cat','tiger','white-bird','white-cat'];
(async()=>{
 const source=path.join(root,'asset/wedding/pixelAnimal/animal-backs-source.webp');
 const meta=await sharp(source).metadata();
 const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(let i=0;i<ids.length;i++){
  const left=Math.floor(i%4*meta.width/4),top=Math.floor(Math.floor(i/4)*meta.height/3);
  const width=Math.floor((i%4+1)*meta.width/4)-left,height=Math.floor((Math.floor(i/4)+1)*meta.height/3)-top;
  const cell=await sharp(source).extract({left,top,width,height}).png().toBuffer();
  const {data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=width,t=height,r=-1,b=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*info.channels+3]>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(r<l)throw Error('Empty back '+ids[i]);
  const file=`animal-${ids[i]}-back.webp`,input=`wedding/pixelAnimal/${file}`,output=`wedding/pixelAnimal/${file}`;
  await sharp(cell).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({width:256,height:256,fit:'inside',kernel:'nearest'}).webp({lossless:true}).toFile(path.join(root,'asset',input));
  copyAsset(path.join(root,'asset',input),path.join(root,'frontend/public',output));
  if(!manifest.some(e=>e.public===output))manifest.push({source:input,public:output,mode:'copy'});
 }
 writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log('Built 12 animal back views');
})();
