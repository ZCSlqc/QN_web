import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'
const root = fileURLToPath(new URL('../dist/', import.meta.url))
let count = 0, reused = 0
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = resolve(folder, entry.name)
    if (entry.isDirectory()) { await walk(file); continue }
    if (!/\.(html|css|js|json|geojson|svg)$/.test(file)) continue
    const source = await stat(file)
    const packed = await Promise.all(['.gz', '.br'].map(suffix => stat(file + suffix).catch(error => { if(error.code==='ENOENT')return null;throw error })))
    if (packed.every(info => info?.mtimeMs >= source.mtimeMs)) { reused++; continue }
    const data = await readFile(file)
    await writeFile(file + '.gz', gzipSync(data, { level: 6 }))
    await writeFile(file + '.br', brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }))
    count++
  }
}
await walk(root)
console.log(`Precompressed ${count} static files; reused ${reused}; images and audio unchanged.`)
