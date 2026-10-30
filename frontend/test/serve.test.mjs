import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { gzipSync } from 'node:zlib'
import { createFrontendServer } from '../scripts/serve.mjs'

test('production static delivery, SPA routing, cache, compression, music ranges and API proxy', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'qn-static-'))
  await mkdir(join(folder, 'assets')); await mkdir(join(folder, 'shared', 'audio'), { recursive: true })
  await writeFile(join(folder, 'index.html'), '<!doctype html><h1>built website</h1>')
  await writeFile(join(folder, 'assets', 'app-a1234567.js'), 'console.log("production");'.repeat(100))
  const packed = gzipSync('console.log("production");'.repeat(100))
  await writeFile(join(folder, 'assets', 'app-a1234567.js.gz'), packed)
  await writeFile(join(folder, '.env'), 'secret')
  await writeFile(join(folder, 'shared', 'audio', 'music.mp3'), '0123456789')
  const backend = http.createServer((req, res) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'private, no-store'); res.end(JSON.stringify({ url: req.url, method: req.method, auth: req.headers.authorization, body: Buffer.concat(chunks).toString() })) })
  })
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve))
  const server = createFrontendServer({ directory: folder, apiTarget: `http://127.0.0.1:${backend.address().port}`, allowedHosts: ['frp-way.com'] })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await fetch(base+'/')).status, 200)
    const page = await fetch(base+'/pet', { headers: { accept: 'text/html', 'accept-encoding': 'br' } })
    assert.equal(page.status, 200); assert.equal(page.headers.get('content-encoding'), 'br'); assert.match(await page.text(), /built website/)
    const code = await fetch(base+'/assets/app-a1234567.js', { headers: { 'accept-encoding': 'gzip' } })
    assert.equal(Number(code.headers.get('content-length')), packed.length)
    assert.equal(code.headers.get('content-encoding'), 'gzip'); assert.match(code.headers.get('cache-control'), /immutable/); await code.text()
    const cached = await fetch(base+'/assets/app-a1234567.js', { headers: { 'accept-encoding': 'gzip', 'if-none-match': code.headers.get('etag') } })
    assert.equal(cached.status, 304); assert.equal(await cached.text(), '')
    const audio = await fetch(base+'/shared/audio/music.mp3', { headers: { range: 'bytes=2-5' } })
    assert.equal(audio.headers.get('content-type'), 'audio/mpeg')
    assert.equal(audio.status, 206); assert.equal(audio.headers.get('content-range'), 'bytes 2-5/10'); assert.equal(await audio.text(), '2345')
    const suffix = await fetch(base+'/shared/audio/music.mp3', { headers: { range: 'bytes=-3' } }); assert.equal(await suffix.text(), '789')
    assert.equal((await fetch(base+'/shared/audio/music.mp3', { headers: { range: 'bytes=99-' } })).status, 416)
    assert.equal((await fetch(base+'/.env')).status, 404)
    assert.equal((await fetch(base+'/src/main.js')).status, 404)
    const proxied = await fetch(base+'/api/photos?test=1', { method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'text/plain' }, body: 'uploaded bytes' })
    assert.equal(proxied.headers.get('cache-control'), 'private, no-store')
    assert.deepEqual(await proxied.json(), { url: '/photos?test=1', method: 'POST', auth: 'Bearer test', body: 'uploaded bytes' })
    const hostStatus = await new Promise((resolve, reject) => {
      http.get(base+'/pet', { headers: { Host: 'untrusted.example', Accept: 'text/html' } }, response => { response.resume(); resolve(response.statusCode) }).on('error', reject)
    })
    assert.equal(hostStatus, 403)
  } finally {
    server.closeAllConnections(); backend.closeAllConnections()
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => backend.close(resolve))])
    await rm(folder, { recursive: true, force: true })
  }
})
