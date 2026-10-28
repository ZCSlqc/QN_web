// Receipts describe newly awarded food only. Animation never changes inventory.
export function announceFoodReward(response) {
  const data = response.data
  if (!data || data.replayed) return
  const path = response.config?.url?.split('?')[0]
  if (response.config?.method?.toLowerCase() === 'post' && ['/mailbox/letters', '/blessings'].includes(path)) {
    window.dispatchEvent(new CustomEvent('message-delivered', { detail: { kind: path === '/mailbox/letters' ? 'letter' : 'blessing' } }))
  }
  const receipt = data.food_reward || (data.reward_status === 'granted' && data.treat_reward > 0 ? { food: 'treat', amount: data.treat_reward } : null)
  if (!receipt || !['treat', 'kibble', 'can'].includes(receipt.food) || !Number.isInteger(receipt.amount) || receipt.amount <= 0) return
  window.dispatchEvent(new CustomEvent('pet-food-earned', { detail: receipt }))
}
