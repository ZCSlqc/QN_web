// Keep unchanged assets' timestamps and browser validators stable across rebuilds.
const fs=require('node:fs'),path=require('node:path');
function writeAsset(file,value){
 const data=Buffer.isBuffer(value)?value:Buffer.from(value);
 try{if(data.equals(fs.readFileSync(file)))return false;}
 catch(error){if(error.code!=='ENOENT')throw error;}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);return true;
}
function copyAsset(source,target){return writeAsset(target,fs.readFileSync(source));}
module.exports={writeAsset,copyAsset};
