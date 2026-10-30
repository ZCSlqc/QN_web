import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, dirname, sep } from 'node:path'

export const artifactRoot = resolve(process.env.QN_TEST_ARTIFACTS_DIR || join(tmpdir(), 'QN_web-tests'))
export function artifactPath(name) {
  const target = resolve(artifactRoot, name)
  if (!target.startsWith(artifactRoot + sep)) throw new Error('Test output must stay inside its report directory')
  mkdirSync(dirname(target), { recursive: true })
  return target
}
