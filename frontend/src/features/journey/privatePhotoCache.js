import request from '../../utils/request'

// Account-scoped memory only: never persisted or shared through a public cache.
const cache = new Map()
const pending = new Map()
let owner = null, bytes = 0
const TTL = 60000, MAX_BYTES = 12 * 1024 * 1024
export function clearPrivatePhotos() { pending.forEach(item => item.controller.abort()); pending.clear(); cache.clear(); bytes = 0; owner = localStorage.getItem('token') }
export function invalidatePrivatePhoto(id) {
  for (const [key, value] of cache) if (key.includes(`/photos/${id}/`)) { cache.delete(key); bytes -= value.blob.size }
  for (const [key, value] of pending) if (key.includes(`/photos/${id}/`)) { value.controller.abort(); pending.delete(key) }
}
export async function privatePhoto(src, signal) {
  const token = localStorage.getItem('token')
  if (owner !== token) clearPrivatePhotos()
  const path = src.replace(/^\/api/, '')
  const found = cache.get(path)
  if (found && Date.now() - found.time < TTL) return found.blob
  if (found) { cache.delete(path); bytes -= found.blob.size }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!pending.has(path)) {
    const entry = { controller: new AbortController(), promise: null }
    entry.promise = request.get(path, { responseType: 'blob', signal: entry.controller.signal }).then(({ data }) => {
  if (!entry.controller.signal.aborted && localStorage.getItem('token') === token && data.size <= MAX_BYTES) {
    const previous = cache.get(path)
    if (previous) bytes -= previous.blob.size
    cache.delete(path)
    while (cache.size && (bytes + data.size > MAX_BYTES || cache.size >= 80)) {
      const key = cache.keys().next().value
      bytes -= cache.get(key).blob.size; cache.delete(key)
    }
    cache.set(path, { blob: data, time: Date.now() }); bytes += data.size
  }
  return data
    }).finally(() => { if (pending.get(path) === entry) pending.delete(path) })
    pending.set(path, entry)
  }
  const promise = pending.get(path).promise
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}
window.addEventListener('auth-expired', clearPrivatePhotos)
window.addEventListener('storage', event => { if (event.key === 'token') clearPrivatePhotos() })
