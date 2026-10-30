const { writeAsset, copyAsset } = require('./asset-files.cjs');
// Preserve imagegen alpha and publish compact, consistently padded back sprites.
const fs = require('node:fs');
const path = require('node:path');
const { writeEmojiFrame } = require('./emoji-frame.cjs');
const root = path.resolve(__dirname, '../..');
const names = ['yellow', 'party', 'little-devil', 'invisible', 'freezing', 'mind-blown', 'secret'];
async function main() {
  const manifestPath = path.join(root, 'asset/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const name of names) {
    const input = path.join(root, `asset/wedding/emoji/sources/back/${name}.webp`);
    const rel=`wedding/emoji/${name}-back.webp`;
    await writeEmojiFrame(input,path.join(root,'asset',rel));
    copyAsset(path.join(root,'asset',rel),path.join(root,'frontend/public',rel));
    if(!manifest.some(e=>e.public===rel))manifest.push({source:rel,public:rel,mode:'copy'});
  }
  writeAsset(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  console.log('Built seven painted emoji back sprites; source/public paths match.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
