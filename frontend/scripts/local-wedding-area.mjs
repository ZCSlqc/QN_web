import {readFile,writeFile,rename,unlink,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {areaError} from '../src/features/wedding/areaGeometry.js';

const localHosts=new Set(['localhost','127.0.0.1','[::1]']);
export function createAreaSaveHandler({file,apiTarget}){
 let saving=false;
 return async(req,res,next=()=>{res.statusCode=404;res.end();})=>{
  if(req.url?.split('?')[0]!=='/__local/wedding-area')return next();
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   const host=new URL(`http://${req.headers.host}`).hostname;
   const origin=req.headers.origin&&new URL(req.headers.origin);
   if(!localHosts.has(host)||origin&&(origin.host!==req.headers.host||!localHosts.has(origin.hostname)))return send(403,{detail:'仅限本机开发页面保存'});
   if(req.method!=='POST')return send(405,{detail:'请使用保存操作'});
   if(!req.headers.authorization?.startsWith('Bearer '))return send(401,{detail:'请先登录管理员账号'});
   const check=await fetch(new URL('me',apiTarget.replace(/\/?$/,'/')),{headers:{Authorization:req.headers.authorization},signal:AbortSignal.timeout(5000)});
   if(!check.ok)return send(check.status===401?401:403,{detail:'无法确认管理员权限'});
   if((await check.json()).is_admin!==true)return send(403,{detail:'仅管理员可保存范围'});
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>64000)return send(413,{detail:'范围文件过大'});chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');
   let area;try{area=JSON.parse(raw);const invalid=areaError(area);if(invalid)throw Error(invalid);}catch(error){return send(400,{detail:`范围无效：${error.message}`});}
   if(saving)return send(409,{detail:'正在保存，请稍后重试'});
   saving=true;
   const temporary=join(dirname(file),`.walkable-area-${randomUUID()}.tmp`);
   try{
    const previous=await readFile(file,'utf8'),old=JSON.parse(previous);
    if(area.width!==old.width||area.height!==old.height||area.world.width!==old.world.width||area.world.height!==old.world.height)return send(400,{detail:'底图和场景尺寸必须与当前婚礼一致'});
    const content=JSON.stringify({...old,points:area.points.map(p=>[...p])},null,2)+'\n';
    if(previous!==content){
     const folder=join(tmpdir(),'QN_web-area-backups');await mkdir(folder,{recursive:true});await writeFile(join(folder,`walkable-area-${Date.now()}-${randomUUID()}.json`),previous);
     await writeFile(temporary,content,{flag:'wx'});await rename(temporary,file);
    }
    send(200,{saved:true,file:'frontend/src/features/wedding/walkable-area.json',points:area.points.length});
   }finally{saving=false;await unlink(temporary).catch(()=>{});}
  }catch{if(!res.headersSent)send(503,{detail:'本机保存服务暂时不可用，草稿已保留，可导出 JSON'});else res.end();}
 };
}
export function localWeddingArea({apiTarget}){
 return {name:'local-wedding-area',apply:'serve',configureServer(server){server.middlewares.use(createAreaSaveHandler({file:fileURLToPath(new URL('../src/features/wedding/walkable-area.json',import.meta.url)),apiTarget}));}};
}
