import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, copyFile, utimes, stat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publicCache } from '../scripts/public-cache.mjs'
import { createFrontendServer } from '../scripts/serve.mjs'

test('unchanged public files still return 304 after a new build, and updated files return new content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qn-public-cache-'))
  const source = join(root, 'public'), output = join(root, 'dist')
  await mkdir(source); await mkdir(output)
  const input = join(source, 'portrait.webp'), file = join(output, 'portrait.webp')
  await writeFile(input, 'first image'); await utimes(input, 1000.1238, 1000.1238)
  const plugin = publicCache()
  plugin.configResolved({ command: 'build', root, publicDir: source, build: { outDir: 'dist' } })
  await copyFile(input, file); await plugin.writeBundle()
  assert.equal(Math.trunc((await stat(file)).mtimeMs), Math.trunc((await stat(input)).mtimeMs))
  const server = createFrontendServer({ directory: output, apiTarget: 'http://127.0.0.1:1' })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/portrait.webp`
  try {
    const initial = await fetch(url); assert.equal(await initial.text(), 'first image')
    const validator = initial.headers.get('etag')
    // Simulate Vite copying the same file again with a fresh destination time.
    await copyFile(input, file); await plugin.writeBundle()
    const cached = await fetch(url, { headers: { 'If-None-Match': validator } })
    assert.equal(cached.status, 304); assert.equal(await cached.text(), '')
    await writeFile(input, 'other image'); await utimes(input, new Date(2000000), new Date(2000000))
    await copyFile(input, file); await plugin.writeBundle()
    const changed = await fetch(url, { headers: { 'If-None-Match': validator } })
    assert.equal(changed.status, 200); assert.notEqual(changed.headers.get('etag'), validator)
    assert.equal(await changed.text(), 'other image')
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
})
