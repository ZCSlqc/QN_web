// Parsed geometry is shared by map layers and province/city selectors for this page session.
const cache = new Map()

export function readGeo(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error('Map unavailable')
      return response.json()
    }).catch(error => { cache.delete(path); throw error }))
  }
  return cache.get(path)
}
