// Already normalized WebP backs are canonical, without duplicate raw sources.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {copyAsset}=require('./asset-files.cjs');
const root=path.resolve(__dirname,'../..');
async function main(){
 const names=['yellow','party','little-devil','invisible','freezing','mind-blown','secret'];
 for(const name of names){
  const relative=`wedding/emoji/${name}-back.webp`,source=path.join(root,'asset',relative);
  const meta=await sharp(source).metadata();
  if(meta.width!==256||meta.height!==256||!meta.hasAlpha)throw Error(`Invalid emoji back: ${name}`);
  copyAsset(source,path.join(root,'frontend/public',relative));
 }
 console.log('Published seven normalized emoji back sprites.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
