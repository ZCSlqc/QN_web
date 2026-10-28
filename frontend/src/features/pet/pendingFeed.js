const PREFIX = 'qn.pet.pending.'
const foods = new Set(['treat', 'kibble', 'can', 'reward_treat'])
const validUserId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export function readPendingFeed(userId) {
  if (!validUserId(userId)) return null
  try {
    const value = JSON.parse(sessionStorage.getItem(PREFIX + userId) || 'null')
    return value && value.userId === userId && foods.has(value.food) && /^[a-f0-9]{32}$/.test(value.key) ? value : null
  } catch { return null }
}

export function writePendingFeed(userId, food, key) {
  if (!validUserId(userId)) throw new Error('Missing account identity')
  sessionStorage.setItem(PREFIX + userId, JSON.stringify({ userId, food, key }))
}

export function clearPendingFeed(userId) {
  if (!validUserId(userId)) return
  try { sessionStorage.removeItem(PREFIX + userId) } catch { /* Account isolation still applies in memory. */ }
}
