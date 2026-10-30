const { writeAsset, copyAsset } = require('./asset-files.cjs');
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'asset/wedding/juggler'),output=path.join(root,'frontend/public/wedding/juggler');
const props=['gold-ingot','gold-bar','lucky-coins'];
async function main(){
 fs.mkdirSync(output,{recursive:true});const catalog=[];
 const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const id of props){
  const source=`sources/${id}.webp`,file=id+'.webp';
  const info=await sharp(path.join(folder,source)).trim().resize({width:192,height:192,fit:'inside',withoutEnlargement:true}).webp({lossless:true,effort:6}).toFile(path.join(folder,file));
  copyAsset(path.join(folder,file),path.join(output,file));
  catalog.push({id,source,file,width:info.width,height:info.height,bytes:info.size});
  const rel=`wedding/juggler/${file}`,entry={source:rel,public:rel,mode:'copy'},index=manifest.findIndex(e=>e.public===rel);
  if(index<0)manifest.push(entry);else manifest[index]=entry;
 }
 writeAsset(path.join(folder,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log(`Built ${catalog.length} juggling props from asset/wedding/juggler/sources/.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
