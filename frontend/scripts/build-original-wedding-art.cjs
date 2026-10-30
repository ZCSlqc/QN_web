// Unpack the AI-generated transparent atlas. Source RGBA is preserved; connected
// component labels separate touching neighbours and keep detached confetti.
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'asset/wedding/original');
const rows=[
 [['lemon-iced-tea','柠檬冰茶'],['orange-juice','鲜榨橙汁'],['pearl-milk-tea','珍珠奶茶'],['iced-coffee','冰咖啡'],['coconut-drink','椰子饮'],['strawberry-milkshake','草莓奶昔']],
 [['burger','汉堡'],['fried-chicken','炸鸡腿'],['fries','薯条'],['pizza','披萨'],['hot-dog','热狗'],['takoyaki','章鱼小丸子']],
 [['dumpling-platter','饺子拼盘'],['xiaolongbao','小笼包'],['egg-fried-rice','蛋炒饭'],['beef-noodles','牛肉面'],['kung-pao-chicken','宫保鸡丁饭'],['sweet-sour-ribs','糖醋排骨饭']],
 [['strawberry-cake','草莓蛋糕'],['chocolate-cake','巧克力蛋糕'],['matcha-roll','抹茶卷'],['mango-cheesecake','芒果芝士蛋糕'],['vanilla-cone','香草甜筒'],['strawberry-sundae','草莓冰淇淋']],
 [['bouquet-garden','奶油花园捧花'],['gift-garden','薄荷金带礼盒'],['balloons-garden','奶油粉气球'],['popper-garden','奶油花园礼花'],['basket-garden','奶油花园花篮'],['rose-garden','浅粉玫瑰']],
 [['bouquet-festive','红金喜庆捧花'],['gift-festive','红色金带礼盒'],['balloons-festive','红金气球'],['popper-festive','红金礼花'],['basket-festive','红金玫瑰花篮'],['rose-festive','酒红玫瑰']],
 [['gold-ingot','元宝'],['gold-bar','金条'],['lucky-coins','钱币'],['wedding-rings','婚戒'],['heart','爱心'],['stars','星星']],
 [['idea','灯泡'],['envelope','信封']],
];
const ys=[151,356,540,714,908,1099,1253,1380],xs=[[100,282,458,634,827,1008],[104,289,464,644,828,1007],[103,288,465,642,823,1000],[103,289,469,650,829,1004],[112,302,478,636,822,1010],[112,304,476,638,822,1007],[99,283,466,642,820,1001],[96,290]];
const categories=['drinks','food','meals','desserts'];
const seeds=rows.flatMap((row,r)=>row.map(([id,name],c)=>({id,name,x:xs[r][c],y:ys[r],row:r,col:c})));
const distance=(x,y,s)=>(x-s.x)**2+(y-s.y)**2;
const nearest=(x,y,candidates=seeds)=>candidates.reduce((a,b)=>distance(x,y,a)<distance(x,y,b)?a:b);
async function main(){
 const {data,info}=await sharp(path.join(base,'source/sprite-atlas.webp')).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
 if(w!==1086||h!==1448)throw Error('Atlas layout needs recalibration for its new dimensions');
 const size=w*h,visited=new Uint8Array(size),owners=new Uint8Array(size),queue=new Int32Array(size);seeds.forEach((s,i)=>s.index=i+1);
 for(let i=0;i<size;i++)if(!visited[i]&&data[i*4+3]>64){let head=0,tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=i;visited[i]=1;
  while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!visited[n]&&data[n*4+3]>64){visited[n]=1;queue[tail++]=n;}
  }
  const candidates=seeds.filter(s=>s.x>=x0&&s.x<=x1&&s.y>=y0&&s.y<=y1),single=candidates.length===1?candidates[0]:candidates.length?null:nearest((x0+x1)/2,(y0+y1)/2);
  for(let j=0;j<tail;j++){const p=queue[j];owners[p]=(single||nearest(p%w,(p/w)|0,candidates)).index;}
 }
 // Assign antialias fringe to its neighbouring opaque core without recolouring.
 let head=0,tail=0;for(let p=0;p<size;p++)if(owners[p])queue[tail++]=p;
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!owners[n]&&data[n*4+3]>0){owners[n]=owners[p];queue[tail++]=n;}}
 const items=[];
 for(const seed of seeds){let x0=w,y0=h,x1=0,y1=0,pixels=0;
  for(let p=0;p<size;p++)if(owners[p]===seed.index){const x=p%w,y=(p/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);pixels++;}
  if(pixels<500)throw Error(`Missing or tiny sprite ${seed.id}`);const width=x1-x0+1,height=y1-y0+1,rgba=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y+y0)*w+x+x0;if(owners[p]===seed.index)data.copy(rgba,(y*width+x)*4,p*4,p*4+4);}
  const group=seed.row<4?['drinks','snacks','meals','desserts'][seed.row]:seed.row<6?`flowers/${seed.row===4?'garden':'festive'}`:seed.row===6&&seed.col<3?'juggling':'decorations';
  const effect=['heart','stars','idea','envelope'].includes(seed.id),relative=effect?'shared/icons':`wedding/original/${group}`,folder=path.join(root,'asset',relative);await fs.mkdir(folder,{recursive:true});
  const file=seed.id+'.webp';await sharp(rgba,{raw:{width,height,channels:4}}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).webp({quality:90,alphaQuality:100,effort:6}).toFile(path.join(folder,file));
  const meta=await sharp(path.join(folder,file)).metadata(),food=seed.row<4,florist=seed.row===4||seed.row===5,category=food?categories[seed.row]:florist?['flowers','gifts','balloons','celebration','flowers','flowers'][seed.col]:effect?'effects':'decoration';
  const style=food?['refreshing','snack','banquet','patisserie'][seed.row]:florist?seed.row===4?'garden':'festive':'celebration';
  const hand=food?(category==='drinks'?[.5,.68]:[.5,.86]):florist?[[.5,.85],[.5,.86],[.5,.86],[.38,.83],[.5,.88],[.5,.86]][seed.col]:[.5,.8];
  if(seed.id==='fried-chicken'){hand[0]=.82;hand[1]=.24;}
  if(category==='meals')hand[1]=.91;
  const image=`/${relative}/${file}`;
  items.push({id:seed.id,name:seed.name,category,style,uses:food||florist?['handheld','tabletop']:['decoration'],image,width:meta.width,height:meta.height,anchors:{hand,table:[.5,(meta.height-4)/meta.height]},hands:category==='meals'||category==='gifts'||seed.id.startsWith('basket-')||seed.id==='takoyaki'?2:1,suggestedWorldHeight:food?category==='meals'?25:category==='drinks'?30:24:florist?[39,29,54,36,34,36][seed.col]:24,sourceBounds:{left:x0,top:y0,width,height},sourcePixels:pixels});
 }
 await fs.writeFile(path.join(base,'catalog.json'),JSON.stringify({version:2,art:'original approved collection',items},null,2)+'\n');
 const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const preview='wedding/payment/wechat-preview.webp';
 await sharp(path.join(root,'asset/wedding/payment/wechat-receive.jpg')).resize({width:280,withoutEnlargement:true}).webp({quality:92,effort:6}).toFile(path.join(root,'asset',preview));
 if(!manifest.some(e=>e.public===preview))manifest.push({source:preview,public:preview,mode:'copy'});
 for(const item of items){const entry={source:item.image.slice(1),public:item.image.slice(1),mode:'copy'},index=manifest.findIndex(e=>e.public===entry.public);if(index<0)manifest.push(entry);else manifest[index]=entry;}
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(`Built ${items.length} original sprites; ${items.filter(i=>i.uses.includes('handheld')).length} handheld.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
