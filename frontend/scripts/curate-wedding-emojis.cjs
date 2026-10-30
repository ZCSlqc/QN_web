// The compact, normalized WebP files are the canonical sources.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {copyAsset,writeAsset}=require('./asset-files.cjs');
const root=path.resolve(__dirname,'../..'),base='wedding/emoji';
async function main(){
 const catalogPath=path.join(root,'asset',base,'catalog.json');
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
 for(const item of catalog){
  const relative=`${base}/${item.file}`,source=path.join(root,'asset',relative);
  const meta=await sharp(source).metadata();
  if(meta.width!==256||meta.height!==256||!meta.hasAlpha)throw Error(`Invalid emoji frame: ${item.id}`);
  item.source=relative;delete item.original;
  copyAsset(source,path.join(root,'frontend/public',relative));
 }
 writeAsset(catalogPath,JSON.stringify(catalog,null,2)+'\n');
 writeAsset(path.join(root,'frontend/src/features/wedding/emojiHeads.json'),JSON.stringify(catalog,null,2)+'\n');
 console.log(`Published ${catalog.length} normalized emoji heads; ${catalog.filter(i=>i.featured).length} featured.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
