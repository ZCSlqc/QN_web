const { writeAsset, copyAsset } = require('./asset-files.cjs');
const { sourcePath, assetPath } = require('./asset-layout.cjs');
// Import new art once; rebuild from the canonical WebP sources in asset/.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const base = 'wedding/good';
const foodCategories = ['food', 'drinks', 'desserts', 'fruits', 'meals'];
const specs = [
  ['emojiHead', '8828bef0-609d-448e-8e09-84e6c09eea3e', 'party-popper', '礼花筒', 'celebration', ['handheld','tabletop'], [.3,.8], 36],
  ['food', '可乐', 'cola', '可乐', 'drinks', ['handheld','tabletop'], [.5,.68], 26],
  ['food', '奶茶', 'bubble-tea', '珍珠奶茶', 'drinks', ['handheld','tabletop'], [.5,.68], 27],
  ['food', '汉堡', 'burger', '汉堡', 'food', ['handheld','tabletop'], [.5,.72], 29],
  ['food', '牛油果', 'avocado-half', '半颗牛油果', 'food', ['tabletop'], null, 27],
  ['food', '甜甜圈', 'strawberry-donut', '草莓糖霜甜甜圈', 'desserts', ['handheld','tabletop'], [.5,.78], 25],
  ['food', '蛋挞', 'egg-tart', '蛋挞', 'desserts', ['handheld','tabletop'], [.5,.76], 24],
  ['food', '蛋糕 (1)', 'chocolate-berry-cake', '巧克力莓果蛋糕', 'desserts', ['tabletop'], null, 38],
  ['food', '蛋糕 (2)', 'cherry-cake-slice', '樱桃奶油蛋糕切片', 'desserts', ['handheld','tabletop'], [.5,.87], 28],
  ['food', '雪糕', 'cherry-ice-cream-cone', '樱桃冰淇淋甜筒', 'desserts', ['handheld','tabletop'], [.5,.76], 30],
  ['good', 'flat-icon-birthday-balloons', 'balloon-bunch-burgundy-cream', '酒红奶油色气球束', 'balloons', ['handheld'], [.5,.96], 68],
  ['good', 'flat-icon-bouquet-wedding', 'bouquet-burgundy-white', '酒红白玫瑰花束', 'flowers', ['handheld','tabletop'], [.5,.82], 40],
  ['good', 'sticker-bouquet-wedding', 'bouquet-blush-sticker', '浅粉花束（贴纸款）', 'flowers', ['handheld','tabletop'], [.5,.83], 40],
  ['good', '礼物 (1)', 'gift-box-mint-gold', '薄荷绿金色礼盒', 'gifts', ['handheld','tabletop'], [.5,.82], 32],
  ['good', '礼物', 'gift-box-red-gold', '红色金带礼盒', 'gifts', ['handheld','tabletop'], [.5,.82], 32],
  ['good', '花 喇叭花 鲜花', 'hibiscus-yellow', '黄色扶桑花', 'flowers', ['handheld','tabletop'], [.3,.76], 29],
  ['good', '花 玫瑰花 鲜花', 'rose-red', '红玫瑰', 'flowers', ['handheld','tabletop'], [.5,.86], 34],
  ['good', '花 花篮 鲜花 玫瑰花', 'flower-basket-pastel', '彩色鲜花篮', 'flowers', ['tabletop'], null, 37],
  ...[
    ['苹果','apple','苹果'], ['香蕉','banana','香蕉'], ['桃子','peach','桃子'],
    ['桔子','mandarins','桔子'], ['橙子','orange-half','半颗橙子'], ['葡萄','grapes','葡萄'],
    ['蓝莓','blueberries','蓝莓'], ['菠萝','pineapple','菠萝'], ['哈密瓜','cantaloupe','哈密瓜'],
    ['猕猴桃','kiwi-half','半颗猕猴桃'], ['牛油果','avocado-sticker','牛油果（贴纸款）'],
    ['椰子','coconut-drink','椰子饮品'],
  ].map(([original,id,name])=>['asset',original,id,name,'fruits',['handheld','tabletop'],[.5,.78],27]),
  ...[['汤','soup-bowl','暖心汤'],['红烧鱼','braised-fish','红烧鱼'],['饺子','dumpling-platter','饺子拼盘']]
    .map(([original,id,name])=>['asset',original,id,name,'meals',['handheld','tabletop'],[.5,.9],33]),
];
const labels = { celebration:'庆祝物件', drinks:'饮品', food:'食物', desserts:'甜点', fruits:'水果', meals:'餐食', balloons:'气球', flowers:'鲜花', gifts:'礼物' };
async function main() {
  const items=[];
  for(const [folder,original,id,name,category,uses,grip,height] of specs) {
    const itemBase=`wedding/${foodCategories.includes(category)?'food':'good'}`;
    const sourceDir=`${itemBase}/sources/${category}`;
    await fs.mkdir(assetPath(sourceDir),{recursive:true});
    const sources=[];
    for(const ext of folder === 'emojiHead' ? ['webp'] : folder==='asset'?['webp']:['webp','svg']) {
      const source=folder==='asset'?path.join(root,'asset',`${original}.${ext}`):path.join(root,'artifacts',folder,`${original}.${ext}`),target=`${sourceDir}/${id}.${ext}`;
      try {
        await fs.access(assetPath(target));
      } catch {
        try {
          if(ext==='webp') {
            const imported=source.replace(/\.webp$/,'.png');
            const input=await fs.access(source).then(()=>source,()=>imported);
            await sharp(await fs.readFile(input)).webp({lossless:true,effort:6}).toFile(assetPath(target));
          } else copyAsset(source,assetPath(target));
        }
        catch(error) {if(ext==='svg'&&error.code==='ENOENT')continue; throw error;}
      }
      sources.push(sourcePath(target));
    }
    const input=assetPath(sources.find(p=>/\.(png|webp)$/.test(p)));
    const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let left=info.width,top=info.height,right=-1,bottom=-1;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left)throw Error(`Empty art: ${id}`);
    const web=`${itemBase}/${id}.webp`;
    await fs.mkdir(assetPath(itemBase),{recursive:true});
    // Preserve original alpha, use lossless compression and remove only transparent padding.
    await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1})
      .resize({width:248,height:248,fit:'inside',withoutEnlargement:true})
      .extend({top:4,bottom:4,left:4,right:4,background:'#00000000'})
      .webp({lossless:true}).toFile(assetPath(web));
    await fs.mkdir(path.join(root,'frontend/public',itemBase),{recursive:true});
    copyAsset(assetPath(web),path.join(root,'frontend/public',web));
    const meta=await sharp(assetPath(web)).metadata();
    items.push({id,name,category,uses,image:`/${web}`,width:meta.width,height:meta.height,
      anchors:{hand:grip,table:[.5,(meta.height-4)/meta.height]},
      suggestedWorldHeight:height,placementNote:id==='cherry-ice-cream-cone'?'桌面陈列需甜筒架':id==='cherry-cake-slice'?'手持时建议配小碟':null,
      sources,sourceBounds:{left,top,width:right-left+1,height:bottom-top+1},
      style:id.includes('sticker')||folder==='asset'&&category==='fruits'?'pastel-sticker':folder==='good'&&original.startsWith('flat-')?'soft-flat':'bold-outline'});
  }
  const catalog={version:1,anchorSpace:'normalized trimmed web image; x right, y down',
    notes:'手持握点及世界尺寸为初始建议，接入手部/餐桌后需视觉校准；table落点仅表示图像底部接触位置。',items};
  writeAsset(assetPath(base,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  for(const file of items.map(i=>i.image.slice(1))) {
    const entry={source:sourcePath(file),public:sourcePath(file),mode:'copy'};
    const index=manifest.findIndex(e=>e.public===sourcePath(file));
    if(index>=0)manifest[index]=entry;else manifest.push(entry);
  }
  const cards=items.map(i=>`<article data-uses="${i.uses.join(' ')}"><div class="art"><img src="${i.id}.webp" alt="${i.name}" loading="lazy" width="${i.width}" height="${i.height}"></div><h2>${i.name}</h2><code>${i.id}</code><p>${labels[i.category]} · ${i.uses.map(u=>u==='handheld'?'可手持':'可摆桌').join(' / ')}</p>${i.placementNote?`<small>${i.placementNote}</small>`:''}</article>`).join('\n');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>婚礼物品素材目录</title><style>
body{margin:0;padding:32px;background:#f7f4ed;color:#51483e;font-family:system-ui,sans-serif}main{max-width:1100px;margin:auto}h1{font-size:26px}header p{color:#817465}nav{display:flex;gap:10px;margin:24px 0;flex-wrap:wrap}button{padding:9px 18px;border:1px solid #d9cdbc;border-radius:22px;cursor:pointer;background:#fff;color:inherit}button[aria-pressed=true]{background:#665e4f;color:white}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}article{padding:16px;background:#fffdf8;border:1px solid #e9e0d3;border-radius:16px}article[hidden]{display:none}.art{height:170px;display:grid;place-items:center;border-radius:10px;background-color:#e9eee7;background-image:linear-gradient(45deg,#fff4 25%,transparent 25%,transparent 75%,#fff4 75%),linear-gradient(45deg,#fff4 25%,transparent 25%,transparent 75%,#fff4 75%);background-size:20px 20px;background-position:0 0,10px 10px}.art img{max-width:150px;max-height:150px;object-fit:contain}h2{font-size:15px;margin-bottom:5px}code{font-size:11px;overflow-wrap:anywhere}article p,small{font-size:12px;color:#8c7968}@media(max-width:500px){body{padding:18px}section{grid-template-columns:repeat(2,minmax(0,1fr))}.art img{max-width:100%}.art{height:140px}}
</style><main><header><h1>婚礼上的小物与美食</h1><p>17 件素材 · 透明背景 · 手持与桌面用途参考</p></header><nav aria-label="筛选用途"><button data-filter="all" aria-pressed="true">全部</button><button data-filter="handheld" aria-pressed="false">手持物品</button><button data-filter="tabletop" aria-pressed="false">桌上物品</button></nav><section>${cards}</section></main><script>document.querySelectorAll('button[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('button[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('article').forEach(card=>card.hidden=button.dataset.filter!=='all'&&!card.dataset.uses.split(' ').includes(button.dataset.filter));}));</script></html>`;
  const sourceHtml = items.reduce((text, item) => text.replace(`src="${item.id}.webp"`,
    `src="${path.relative(assetPath(base), assetPath(item.image.slice(1))).replaceAll('\\','/')}"`), html)
    .replace('17 件素材', `${items.length} 件素材`);
  writeAsset(assetPath(base,'index.html'),sourceHtml);
  writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  let before=0,after=0;
  for(const item of items){before+=(await fs.stat(assetPath(item.sources.find(p=>/\.(png|webp)$/.test(p))))).size;after+=(await fs.stat(assetPath(item.image.slice(1)))).size;}
  console.log(JSON.stringify({items:items.length,handheld:items.filter(i=>i.uses.includes('handheld')).length,tabletop:items.filter(i=>i.uses.includes('tabletop')).length,pngBytes:before,webpBytes:after}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
