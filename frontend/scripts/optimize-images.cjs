const sharp = require('sharp')
const fs = require('node:fs/promises')
const path = require('node:path')

async function main() {
  const root = path.resolve(__dirname, '../public')
  let before = 0, after = 0
  for (const [folder, width, quality] of [['img', 160, 82], ['album', 720, 78], ['background', 1600, 82]]) {
    const out = path.join(root, 'optimized', folder)
    await fs.mkdir(out, { recursive: true })
    for (const name of await fs.readdir(path.join(root, folder))) {
      if (!/\.(png|jpe?g)$/i.test(name)) continue
      const source = path.join(root, folder, name)
      const target = path.join(out, name.replace(/\.[^.]+$/, '.webp'))
      await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(target)
      before += (await fs.stat(source)).size
      after += (await fs.stat(target)).size
    }
  }
  console.log(`Display images: ${(before / 1048576).toFixed(2)} MB → ${(after / 1048576).toFixed(2)} MB; originals preserved.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
