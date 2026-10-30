import { createReadStream } from 'node:fs'
import { stat, realpath, readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { gzipSync } from 'node:zlib'

// Dev/preview tunnel traffic gets conditional caching and compressed map/SVG files.
// API responses are never handled here; music keeps Vite's range-request support.
export function staticTransfer() {
  const compressed = new Map()
  const types = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.geojson': 'application/geo+json', '.ico': 'image/x-icon' }
  function install(server, folder) {
    const root = resolve(folder)
    server.middlewares.use(async (req, res, next) => {
      if (!['GET', 'HEAD'].includes(req.method) || req.headers.range) return next()
      let pathname
      try {
        const url = new URL(req.url, 'http://localhost')
        // Vite asset-module requests must remain JavaScript, not image responses.
        if (['import', 'url', 'raw', 'worker'].some(key => url.searchParams.has(key))) return next()
        pathname = decodeURIComponent(url.pathname)
      } catch { return next() }
      if (!/^\/(index|pet|journey|wedding|shared)\//.test(pathname) || !types[extname(pathname)]) return next()
      try {
        const file = await realpath(resolve(root, '.' + pathname))
        if (!file.startsWith(root + sep)) return next()
        const info = await stat(file)
        if (!info.isFile()) return next()
        const compressible = /\.(geojson|svg)$/.test(file)
        const gzip = compressible && /(?:^|,)\s*gzip(?:\s*;\s*q=(?!0(?:\.0*)?(?:\s*,|\s*$))[0-9.]+)?\s*(?:,|$)/i.test(req.headers['accept-encoding'] || '')
        const etag = `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}${gzip ? '-gz' : ''}"`
        res.setHeader('Content-Type', types[extname(file)])
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
        res.setHeader('ETag', etag)
        res.setHeader('Last-Modified', info.mtime.toUTCString())
        res.setHeader('X-Content-Type-Options', 'nosniff')
        if (compressible) res.setHeader('Vary', 'Accept-Encoding')
        if ((req.headers['if-none-match'] || '').split(',').some(value => value.trim().replace(/^W\//, '') === etag)) {
          res.statusCode = 304; res.end(); return
        }
        if (gzip) {
          let entry = compressed.get(file)
          if (!entry || entry.etag !== etag) {
            entry = { etag, body: gzipSync(await readFile(file), { level: 6 }) }
            if (compressed.size >= 8) compressed.clear()
            compressed.set(file, entry)
          }
          res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Content-Length', entry.body.length)
          res.end(req.method === 'HEAD' ? undefined : entry.body)
        } else {
          res.setHeader('Content-Length', info.size)
          if (req.method === 'HEAD') res.end()
          else createReadStream(file).on('error', () => res.destroy()).pipe(res)
        }
      } catch { next() }
    })
  }
  return {
    name: 'static-transfer',
    configureServer(server) { install(server, server.config.publicDir) },
    configurePreviewServer(server) { install(server, resolve(server.config.root, server.config.build.outDir)) },
  }
}
