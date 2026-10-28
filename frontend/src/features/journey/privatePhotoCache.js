import request from '../../utils/request'

// Account-scoped memory only: never persisted or shared through a public cache.
const cache = new Map()
let owner = null, bytes = 0
const TTL = 60000, MAX_BYTES = 12 * 1024 * 1024
export function clearPrivatePhotos() { cache.clear(); bytes = 0; owner = localStorage.getItem('token') }
export function invalidatePrivatePhoto(id) {
  for (const [key, value] of cache) if (key.includes(`/photos/${id}/`)) { cache.delete(key); bytes -= value.blob.size }
}
export async function privatePhoto(src, signal) {
  const token = localStorage.getItem('token')
  if (owner !== token) clearPrivatePhotos()
  const path = src.replace(/^\/api/, '')
  const found = cache.get(path)
  if (found && Date.now() - found.time < TTL) return found.blob
  if (found) { cache.delete(path); bytes -= found.blob.size }
  const { data } = await request.get(path, { responseType: 'blob', signal })
  if (!signal?.aborted && localStorage.getItem('token') === token && data.size <= MAX_BYTES) {
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
}
window.addEventListener('auth-expired', clearPrivatePhotos)
window.addEventListener('storage', event => { if (event.key === 'token') clearPrivatePhotos() })
