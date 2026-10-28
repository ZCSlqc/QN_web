// Built assets only: no Vite module server or HMR connection in public mode.
import http from 'node:http'
import https from 'node:https'
import { existsSync, createReadStream } from 'node:fs'
import { stat, realpath } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createGzip, createBrotliCompress, constants } from 'node:zlib'
import { pipeline } from 'node:stream'

const root = fileURLToPath(new URL('../../', import.meta.url))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' }
const hopHeaders = new Set(['connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer'])
function filteredHeaders(headers) {
  const blocked = new Set([...hopHeaders, ...(headers.connection || '').split(',').map(s => s.trim().toLowerCase())])
  return Object.fromEntries(Object.entries(headers).filter(([key]) => !blocked.has(key.toLowerCase())))
}
function encoding(header = '') {
  const values = header.split(',').map(value => {
    const [name, ...params] = value.trim().split(';')
    const quality = params.find(p => p.trim().startsWith('q='))
    return [name, quality ? Number(quality.trim().slice(2)) : 1]
  }).filter(([name, quality]) => ['br', 'gzip'].includes(name) && quality > 0)
  values.sort((a, b) => b[1] - a[1] || (a[0] === 'br' ? -1 : 1))
  return values[0]?.[0]
}
export function createFrontendServer({ directory, apiTarget, allowedHosts = [] }) {
  const folder = resolve(directory), target = new URL(apiTarget)
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('QN_API_TARGET must be HTTP or HTTPS')
  const hosts = new Set(['localhost', '127.0.0.1', '[::1]', ...allowedHosts])
  return http.createServer(async (req, res) => {
    const error = (status, message) => { if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(message) }
    let url
    try { url = new URL(req.url, 'http://localhost') } catch { error(400, 'Invalid URL'); return }
    let host
    try { host = new URL(`http://${req.headers.host || ''}`).hostname } catch { error(400, 'Invalid host'); return }
    if (!hosts.has(host)) { error(403, 'Host not allowed; configure QN_ALLOWED_HOSTS'); return }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const headers = filteredHeaders(req.headers)
      headers.host = target.host
      const upstream = (target.protocol === 'https:' ? https : http).request({ hostname: target.hostname, port: target.port, protocol: target.protocol,
        method: req.method, path: `${target.pathname.replace(/\/$/, '')}${url.pathname.slice(4) || '/'}${url.search}`, headers,
      }, response => {
        res.writeHead(response.statusCode, filteredHeaders(response.headers))
        pipeline(response, res, () => {})
      })
      upstream.setTimeout(120000, () => upstream.destroy(new Error('API timeout')))
      upstream.on('error', () => { if (!res.headersSent) error(502, 'Backend unavailable'); else res.destroy() })
      req.on('aborted', () => upstream.destroy())
      res.on('close', () => { if (!res.writableEnded) upstream.destroy() })
      req.pipe(upstream)
      return
    }
    if (!['GET', 'HEAD'].includes(req.method)) { error(405, 'Method not allowed'); return }
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { error(400, 'Invalid path'); return }
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) { error(404, 'Not found'); return }
    try {
      let file = resolve(folder, '.' + pathname)
      let info
      try { info = await stat(file) } catch { /* SPA routes are handled below. */ }
      if (!info?.isFile()) {
        if (extname(pathname) || (pathname !== '/' && !(req.headers.accept || '').includes('text/html'))) { error(404, 'Not found'); return }
        file = resolve(folder, 'index.html'); info = await stat(file)
      }
      file = await realpath(file)
      const resolvedRoot = await realpath(folder)
      if (!file.startsWith(resolvedRoot + sep)) { error(404, 'Not found'); return }
      const extension = extname(file).toLowerCase()
      if (!mime[extension]) { error(404, 'Not found'); return }
      const compressible = /\.(html|js|css|json|geojson|svg)$/.test(file)
      const codec = compressible && !req.headers.range ? encoding(req.headers['accept-encoding']) : null
      const etag = `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}${codec ? '-' + codec : ''}"`
      res.setHeader('Content-Type', mime[extension])
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate')
      res.setHeader('ETag', etag); res.setHeader('Last-Modified', info.mtime.toUTCString())
      if (compressible) res.setHeader('Vary', 'Accept-Encoding')
      if ((req.headers['if-none-match'] || '').split(',').some(value => value.trim().replace(/^W\//, '') === etag)) { res.statusCode = 304; res.end(); return }
      if (codec) {
        res.setHeader('Content-Encoding', codec)
        if (req.method === 'HEAD') { res.end(); return }
        pipeline(createReadStream(file), codec === 'br' ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }) : createGzip({ level: 6 }), res, () => {})
        return
      }
      res.setHeader('Accept-Ranges', 'bytes')
      let start = 0, end = info.size - 1
      if (req.headers.range && (!req.headers['if-range'] || req.headers['if-range'] === etag || req.headers['if-range'] === info.mtime.toUTCString())) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
        if (range && (range[1] || range[2])) {
          start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]))
          end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1
        } else start = info.size
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
          res.setHeader('Content-Range', `bytes */${info.size}`); error(416, 'Invalid range'); return
        }
        res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`)
      }
      res.setHeader('Content-Length', Math.max(0, end - start + 1))
      if (req.method === 'HEAD' || info.size === 0) res.end()
      else pipeline(createReadStream(file, { start, end }), res, () => {})
    } catch { if (!res.headersSent) error(404, 'Not found'); else res.destroy() }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const envFile = process.env.QN_ENV_FILE || resolve(root, '.env')
  if (existsSync(envFile)) {
    if (!process.loadEnvFile) throw new Error('Use Node.js 20.12+ for the production server')
    process.loadEnvFile(envFile)
  }
  const port = Number(process.env.QN_FRONTEND_PORT || 7721)
  const backendPort = Number(process.env.QN_BACKEND_PORT || 1277)
  if (![port, backendPort].every(value => Number.isInteger(value) && value > 0 && value < 65536)) throw new Error('Invalid configured port')
  const directory = resolve(root, 'frontend/dist')
  if (!existsSync(resolve(directory, 'index.html'))) throw new Error('Run npm run build before npm run serve')
  const server = createFrontendServer({ directory, apiTarget: process.env.QN_API_TARGET || `http://127.0.0.1:${backendPort}`,
    allowedHosts: (process.env.QN_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean) })
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is occupied; stop the development frontend first.` : error.message); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.log(`Built website: http://127.0.0.1:${port} (API → ${backendPort})`))
  const stop = () => { server.close(); server.closeIdleConnections() }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
}
