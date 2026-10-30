// asset/ is authoritative; public/ contains exactly the files in the manifest.
const sharp = require('sharp')
const fs = require('node:fs/promises')
const path = require('node:path')
const { copyAsset, writeAsset } = require('./asset-files.cjs')
function inside(root, relative) {
  const target = path.resolve(root, relative)
  if (!target.startsWith(root + path.sep)) throw new Error(`Asset path escapes its root: ${relative}`)
  return target
}
async function filesIn(folder) {
  const files = []
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Unexpected asset symlink: ${file}`)
    if (entry.isDirectory()) files.push(...await filesIn(file))
    else if (entry.isFile()) files.push(file)
  }
  return files
}
async function buildAssets({ prefix = '', check = false, prune = false } = {}) {
  const root = path.resolve(__dirname, '../..')
  const sources = path.join(root, 'asset'), output = path.join(root, 'frontend/public')
  const manifest = JSON.parse(await fs.readFile(path.join(sources, 'manifest.json'), 'utf8'))
  const selected = manifest.filter(entry => entry.public.startsWith(prefix))
  const expected = new Set(manifest.map(entry => entry.public))
  let changed = 0
  if (expected.size !== manifest.length) throw new Error('Duplicate public paths in asset manifest')
  for (const entry of selected) {
    const source = inside(sources, entry.source), target = inside(output, entry.public)
    await fs.access(source)
    if (check) {
      await fs.access(target)
      if (entry.mode === 'copy' && !(await fs.readFile(source)).equals(await fs.readFile(target))) throw new Error(`Published asset differs from source: ${entry.public}`)
      continue
    }
    await fs.mkdir(path.dirname(target), { recursive: true })
    if (entry.mode === 'copy') changed += Number(copyAsset(source, target))
    else if (entry.mode === 'webp') changed += Number(writeAsset(target, await sharp(source).rotate().resize({ width: entry.width, height: entry.height, withoutEnlargement: true }).webp({ quality: entry.quality || 82 }).toBuffer()))
    else throw new Error(`Unknown asset mode: ${entry.mode}`)
  }
  const extras = (await filesIn(output)).map(file => path.relative(output, file).replaceAll('\\', '/')).filter(file => file.startsWith(prefix) && !expected.has(file))
  if (check && extras.length) throw new Error(`Unmanaged public assets:\n${extras.join('\n')}`)
  if (prune) for (const file of extras) await fs.unlink(inside(output, file))
  console.log(`${check ? 'Verified' : 'Built'} ${selected.length} public assets${check ? '' : `; updated ${changed}`}${prune ? `; removed ${extras.length} unpublished files` : ''}.`)
}
module.exports = { buildAssets }
if (require.main === module) buildAssets({ check: process.argv.includes('--check'), prune: process.argv.includes('--prune') }).catch(error => { console.error(error); process.exitCode = 1 })
