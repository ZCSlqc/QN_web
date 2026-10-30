const { writeAsset, copyAsset } = require('./asset-files.cjs');
const { sourcePath, assetPath } = require('./asset-layout.cjs');
const { frame, writeEmojiFrame } = require('./emoji-frame.cjs');
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..');
const independentBacks = new Set(['party','little-devil','invisible','freezing','mind-blown','secret']);
// Similar smiles, tongues, affection, tears, glasses, then special silhouettes.
const selections=[
['812462da-83d5-41e3-baa5-7dd5ee169e9a','smile','暖暖微笑',false],
['9317c0a3-26fd-464e-bf3b-2a721259fc29','laugh','笑弯了眼',false],
['3f3a04ec-aac3-4725-a51c-2ebb9687bfaf','grin','开怀大笑',false],
['7e110a44-acff-4386-8781-46d4628d2a5e','wink','默契眨眼',false],
['02ca344a-ce50-4467-9760-b3e46305ce24','yummy','美味满足',false],
['212d186e-25ff-48fc-a572-8a740506fa5a','tongue','开心吐舌',false],
['6b30959c-9c83-4498-acee-b94d9ae2e7f1','wink-tongue','调皮眨眼',false],
['75149bfe-a125-4a0f-a886-cd8f4257f35b','goofy','搞怪吐舌',true],
['1f3850e8-4387-4e13-b5dc-3c31f96aba51','drooling','馋到流口水',false],
['2553b944-e93b-4f59-8334-d006e288994f','pucker','嘟嘴亲亲',false],
['be372800-4e03-4895-a211-3a304d178a9b','kiss','飞吻',true],
['21dae628-b75a-4622-b08a-71d04ac74e13','loved','被爱包围',true],
['c1769a83-bb73-4c75-af27-dfdcb8d1aaab','heart-eyes','心动眼神',false],
['e6a35279-aaa8-43d6-89e4-8b55d1cbc898','star-eyes','满眼星星',true],
['767a5d12-432f-4926-9e9a-02cd9533296d','happy-tears','感动泪目',true],
['e454812e-cdd4-4d73-b183-35811ea6a6e6','single-tear','含泪微笑',false],
['2fc8e2d7-f7de-4da7-a393-5ef7837500b7','blank','突然呆住',false],
['f54eb055-704b-4fd2-815e-44050148a9ef','invisible','隐身一下',false],
['5edc315a-7950-47c6-abc7-b92e4319ab6d','glasses','眼镜学霸',false],
['fd10cdb9-fee9-428c-b4c5-b3f724036e0c','monocle','认真研究',false],
['58898fdd-d114-46b7-a17e-3aba51fff6da','disguise','胡子伪装',false],
['ddcac224-e7ab-4a2d-aa4c-50fb5f283398','cool','墨镜大佬',true],
['3f07805c-4513-4d16-bd0f-f2593f2bdfc5','money','发财啦',false],
['18224430-4aaf-4b32-b88d-bb5319375459','angel','乖乖天使',false],
['fb00755b-8d5e-4e49-868f-5509db956945','party','派对主角',true],
['19719e38-09a3-4c7b-b0ec-c526df4dfefb','little-devil','小恶魔',false],
['5b2f9ed1-8e08-4f1e-bbf0-bbb36082ed4e','freezing','冻得发抖',false],
['46fc5286-ecf7-427f-905a-5b9abea9300f','mind-blown','惊到冒烟',true],
['0de862d7-c7b9-40b6-a84c-2ca0b591586b','secret','秘密',false],
];
(async()=>{
 const base='wedding/emoji';fs.mkdirSync(assetPath(base,'sources'),{recursive:true});fs.mkdirSync(path.join(root,'frontend/public',base),{recursive:true});
 const catalog=[];
 for(const [original,id,label,featured] of selections){
  const source=`${base}/sources/${id}.webp`,file=`${id}.webp`;
  if(!fs.existsSync(assetPath(source)))copyAsset(path.join(root,'artifacts/emojiHead',original+'.webp'),assetPath(source));
  await writeEmojiFrame(assetPath(source),assetPath(base,file));
  copyAsset(assetPath(base,file),path.join(root,'frontend/public',base,file));
  catalog.push({id:`emoji-${id}`,name:label,label,featured,slot:'emojiHead',file,
    width:frame.width,height:frame.height,contentSize:frame.contentSize,anchor:frame.anchor,
    backFile:`${independentBacks.has(id) ? id : 'yellow'}-back.webp`,
    original:`artifacts/emojiHead/${original}.webp`,source:sourcePath(source)});
 }
 writeAsset(assetPath(base,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 writeAsset(path.join(root,'frontend/src/features/wedding/emojiHeads.json'),JSON.stringify(catalog,null,2)+'\n');
 const manifestPath=path.join(root,'asset/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const item of catalog){const p=`${base}/${item.file}`;if(!manifest.some(e=>e.public===p))manifest.push({source:sourcePath(p),public:p,mode:'copy'});}
 writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log(`Imported ${catalog.length} emoji heads; originals retained.`);
})();
