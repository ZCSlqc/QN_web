import { readdir, stat, utimes } from 'node:fs/promises'
import { resolve, join } from 'node:path'

// Vite copies public files on every build. Keep their canonical modification
// times so unchanged images/maps retain the production server's HTTP validators.
export function publicCache() {
  let config
  return {
    name: 'public-cache',
    configResolved(value) { config = value },
    async writeBundle() {
      if (config.command !== 'build' || !config.publicDir || config.build.copyPublicDir === false) return
      const sourceRoot = resolve(config.publicDir), output = resolve(config.root, config.build.outDir)
      async function visit(relative = '') {
        for (const entry of await readdir(join(sourceRoot, relative), { withFileTypes: true })) {
          const file = join(relative, entry.name)
          if (entry.isDirectory()) { await visit(file); continue }
          if (!entry.isFile()) continue
          const source = await stat(join(sourceRoot, file))
          await utimes(join(output, file), source.atimeMs / 1000, source.mtimeMs / 1000)
        }
      }
      await visit()
    },
  }
}
