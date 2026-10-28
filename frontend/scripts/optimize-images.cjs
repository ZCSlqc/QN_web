// Rebuild web assets using the source manifest; original files stay outside public.
const sharp = require('sharp')
const fs = require('node:fs/promises')
const path = require('node:path')
async function buildAssets({ prefix = '', check = false } = {}) {
  const root = path.resolve(__dirname, '../..')
  const sources = path.join(root, 'asset'), output = path.join(root, 'frontend/public')
  const manifest = JSON.parse(await fs.readFile(path.join(sources, 'manifest.json'), 'utf8'))
  const selected = manifest.filter(entry => entry.public.startsWith(prefix))
  for (const entry of selected) {
    const source = path.resolve(sources, entry.source), target = path.resolve(output, entry.public)
    if (!source.startsWith(sources + path.sep) || !target.startsWith(output + path.sep)) throw new Error('Asset path escapes its root')
    await fs.access(source)
    if (check) { await fs.access(target); continue }
    await fs.mkdir(path.dirname(target), { recursive: true })
    if (entry.mode === 'copy') await fs.copyFile(source, target)
    else if (entry.mode === 'webp') await sharp(source).rotate().resize({ width: entry.width, height: entry.height, withoutEnlargement: true }).webp({ quality: entry.quality || 82 }).toFile(target)
    else throw new Error(`Unknown asset mode: ${entry.mode}`)
  }
  console.log(`${check ? 'Verified' : 'Built'} ${selected.length} public assets; originals remain in asset/.`)
}
module.exports = { buildAssets }
if (require.main === module) buildAssets({ check: process.argv.includes('--check') }).catch(error => { console.error(error); process.exitCode = 1 })
