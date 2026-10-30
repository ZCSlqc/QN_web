const sharp = require('sharp');
const frame = { width:256, height:256, contentSize:224, anchor:{x:128,y:248} };
async function writeEmojiFrame(input, output) {
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=info.width,t=info.height,r=-1,b=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    if(data[(y*info.width+x)*4+3]<=8)continue;
    l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
  }
  if(r<l)throw Error(`Empty emoji: ${input}`);
  const {data:art,info:size}=await sharp(input).extract({left:l,top:t,width:r-l+1,height:b-t+1})
    .resize({width:frame.contentSize,height:frame.contentSize,fit:'inside'})
    .png().toBuffer({resolveWithObject:true});
  await sharp({create:{width:frame.width,height:frame.height,channels:4,background:'#00000000'}})
    .composite([{input:art,left:Math.round(frame.anchor.x-size.width/2),top:frame.anchor.y-size.height}])
    .webp({quality:92,alphaQuality:100}).toFile(output);
}
module.exports={frame,writeEmojiFrame};
