import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {createAreaSaveHandler} from '../scripts/local-wedding-area.mjs';
import {defaultArea} from '../src/features/wedding/areaConfig.js';

test('local save writes the fixed frontend configuration only after admin verification and polygon validation',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'qn-area-save-')),file=join(folder,'walkable-area.json'),initial=defaultArea();await writeFile(file,JSON.stringify(initial));
 const auth=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({is_admin:req.headers.authorization==='Bearer admin'}));});await new Promise(resolve=>auth.listen(0,'127.0.0.1',resolve));
 const server=http.createServer(createAreaSaveHandler({file,apiTarget:`http://127.0.0.1:${auth.address().port}`}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/__local/wedding-area`,post=(area,token='admin',extra={})=>fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...extra},body:JSON.stringify(area)});
 try{
  assert.equal((await post(initial,'guest')).status,403);
  assert.equal((await post(initial,'admin',{Origin:'https://other.example'})).status,403);
  assert.equal((await post({...initial,points:[[0,0],[100,100],[0,100],[100,0]]})).status,400);
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),initial);
  const next=structuredClone(initial);next.points[0][0]+=.1;const saved=await post(next);assert.equal(saved.status,200);assert.equal((await saved.json()).file,'frontend/src/features/wedding/walkable-area.json');
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),next);
  assert.equal((await post({...next,width:10000})).status,400);assert.deepEqual(JSON.parse(await readFile(file,'utf8')),next);
 }finally{server.closeAllConnections();auth.closeAllConnections();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>auth.close(resolve))]);await rm(folder,{recursive:true,force:true});}
});
