import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root=new URL('../../',import.meta.url),browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
try{
 await page.setContent(await fs.readFile(new URL('asset/wedding/kenney_modular-characters/Vector/vector_skin.svg',root),'utf8'));
 const skin=await page.evaluate(()=>{const p=document.querySelectorAll('path')[1],b=p.getBBox();const map=(x,y)=>({x:(x-b.x)*93/b.width,y:(y-b.y)*164/b.height});return {top:map(40.3,31.15),innerTop:map(20.15,33.55),innerAnkle:map(32,84.7)};});
 await page.setContent(await fs.readFile(new URL('asset/wedding/kenney_modular-characters/Vector/vector_shoes.svg',root),'utf8'));
 const shoes=await page.evaluate(()=>{
  const segments=document.querySelector('path').getAttribute('d').match(/M[^M]+/g),result={};
  for(let style=1;style<=5;style++){
   const x=[30,70,110,150,190][style-1],d=segments.find(d=>new RegExp(`(?:M|L| )${x} 114.25`).test(d));
   const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);document.querySelector('svg').append(p);const b=p.getBBox();
   result[style]={x:(x-b.x)*94/b.width,y:(114.25-b.y)*42/b.height};p.remove();
  }return result;
 });
 await page.setContent(await fs.readFile(new URL('asset/wedding/kenney_modular-characters/Vector/vector_pants.svg',root),'utf8'));
 const pants=await page.evaluate(()=>{
  const paths=[...document.querySelectorAll('path')],out={};
  for(const [name,indices,w,h,vx] of [['long',[12,13,14],111,166,147.15],['short',[9,10,11],107,118,109.15],['shorter',[6,7,8],104,105,71.15]]){
   const boxes=indices.map(i=>paths[i].getBBox()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),width=Math.max(...boxes.map(b=>b.x+b.width))-x,height=Math.max(...boxes.map(b=>b.y+b.height))-y;
   out[name]={x:(vx-x)*w/width,y:(97.95-y)*h/height,inner:{x:(vx-25.9-x)*w/width,y:(102.25-y)*h/height}};
  }return out;
 });
 const pantsInner=Object.fromEntries(Object.entries(pants).map(([key,value])=>[key,value.inner]));for(const value of Object.values(pants))delete value.inner;
 const result={skin,pantsTop:pants.long,pants,pantsInner,shoes};
 await fs.writeFile(new URL('frontend/src/features/wedding/legAttachment.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close();}
