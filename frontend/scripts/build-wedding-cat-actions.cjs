const { writeAsset, copyAsset } = require('./asset-files.cjs');
// Pack approved 3x2 imagegen sheets into six aligned transparent animation frames.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const ids = process.argv.slice(2);
async function pack(id) {
  const input = path.join(root, `asset/wedding/cats/${id}-actions-source.webp`);
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha) throw Error(`${id}: missing alpha`);
  const crops = [];
  for (let i = 0; i < 6; i++) {
    const left = Math.floor((i % 3) * meta.width / 3), top = Math.floor(Math.floor(i / 3) * meta.height / 2);
    const width = Math.floor((i % 3 + 1) * meta.width / 3) - left;
    const height = Math.floor((Math.floor(i / 3) + 1) * meta.height / 2) - top;
    const cell = await sharp(input).extract({left, top, width, height}).png().toBuffer();
    const {data,info} = await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let l=width, r=-1, t=height, b=-1, transparent=0;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const alpha=data[(y*width+x)*info.channels+3];
      if(alpha<16) transparent++;
      if(alpha>32) {l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    }
    if(r<l || transparent < width*height*.1) throw Error(`${id} frame ${i}: missing character or transparency`);
    // A whisker/tail from the neighbouring grid cell can enter this cell.
    // Bound the largest connected silhouette instead of including that fragment.
    const seen=new Uint8Array(width*height), queue=new Int32Array(width*height);
    let largest=0;
    for(let p=0;p<seen.length;p++) {
      if(seen[p] || data[p*info.channels+3]<=32) continue;
      let head=0,end=1,cl=width,cr=0,ct=height,cb=0;
      queue[0]=p;seen[p]=1;
      while(head<end) {
        const n=queue[head++],x=n%width,y=Math.floor(n/width);
        cl=Math.min(cl,x);cr=Math.max(cr,x);ct=Math.min(ct,y);cb=Math.max(cb,y);
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
          const xx=x+dx,yy=y+dy,k=yy*width+xx;
          if(xx<0||xx>=width||yy<0||yy>=height||seen[k]||data[k*info.channels+3]<=32)continue;
          seen[k]=1;queue[end++]=k;
        }
      }
      if(end>largest) {largest=end;l=Math.max(0,cl-2);r=Math.min(width-1,cr+2);t=Math.max(0,ct-2);b=Math.min(height-1,cb+2);}
    }
    crops.push({input: await sharp(cell).extract({left:l,top:t,width:r-l+1,height:b-t+1}).png().toBuffer(), width:r-l+1,height:b-t+1});
  }
  const walkScale=Math.min(232/Math.max(...crops.slice(0,4).map(c=>c.height)),304/Math.max(...crops.slice(0,4).map(c=>c.width)));
  const layers=[];
  for(let i=0;i<6;i++) {
    const c=crops[i], scale=i<4?walkScale:Math.min((i===4?152:232)/c.height,304/c.width);
    const w=Math.round(c.width*scale),h=Math.round(c.height*scale);
    layers.push({input:await sharp(c.input).resize(w,h).png().toBuffer(),left:i*320+Math.round((320-w)/2),top:256-h});
  }
  const rel=`wedding/cats/${id}-actions.webp`;
  await sharp({create:{width:1920,height:256,channels:4,background:'#00000000'}}).composite(layers).webp({quality:90}).toFile(path.join(root,'asset',rel));
  copyAsset(path.join(root,'asset',rel),path.join(root,'frontend/public',rel));
  return {source:rel,public:rel,mode:'copy'};
}
(async()=>{
  const entries=[];
  for(const id of ids.length?ids:['liuyi','anan','guagua','huahua','heihei']) entries.push(await pack(id));
  const file=path.join(root,'asset/manifest.json');
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const e of entries) if(!manifest.some(m=>m.source===e.source))manifest.push(e);
  writeAsset(file,JSON.stringify(manifest,null,2)+'\n');
  console.log(`Packed ${entries.length} cat animation sheets`);
})().catch(error=>{console.error(error);process.exitCode=1;});
