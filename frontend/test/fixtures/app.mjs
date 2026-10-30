import { test as base, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const weddingCats = JSON.parse(readFileSync(new URL('../../../backend/app/core/wedding_cats.json', import.meta.url), 'utf8'))

const imagePath = fileURLToPath(new URL('./images/photo-one.webp', import.meta.url))
export const test = base.extend({
  app: async ({ page }, use) => {
    const state = {
      weddingCats: structuredClone(weddingCats), weddingRole: null, profileUsername:null,weddingPeople:null,weddingPeopleReads:0,
      weddingWardrobe:{appearance:null,outfits:[],revision:0},wardrobeReads:0,wardrobeWrites:0,
      admin: false, nickname: '', viewerId: '1de66a0c-30b4-417b-a95e-e6daf070bcb1', blessingRequests: new Map(), allowedPages: ['/index'], passwordResets: [],
      plans: [],
      letterRewarded: false, mailbox: false, mailboxUsername: '测试甲', mailboxPartner: '测试乙', mailboxLetters: [], mailboxFailAfterSendOnce: false,
      photos: Array.from({ length: 14 }, (_, i) => ({
        id: i + 1, caption: `回忆 ${i + 1}`, width: i === 0 || i === 4 ? 600 : 800, height: i === 0 || i === 4 ? 800 : 600,
        source: 'bundled', url: `/api/photos/${i + 1}/image`, thumbnail_url: `/api/photos/${i + 1}/thumbnail`,
      })),
      blessings: [{ content: '祝你们每天都有小小的开心。', author: '朋友甲' }, { content: '一起去看更多的风景。', author: '朋友乙' }],
      story: { title: '我们的爱情故事', content: '相遇之后，一起走过四季。', version: 1 },
      journeys: [{ id: 1, name: ['上海市', '杭州市'], adcodes: ['310000', '330100'], departure_date: '2025-04-19', return_date: '2025-04-20', checkin_points: '西湖', event: '旅行', notes: '一起看日落。' }],
      todos: [{ id: 1, entry: '看日落', type: '旅行', user: '我们', start_date: '2026-01-01 12:00:00', end_date: null, done: false }],
      code: 'fixture-share-code', revision: 1, editable: true,
      deleted: [], fail: new Set(),
      weather: 'sunny', petCanFeed: false, personalTreats: 0, rewardClaimed: false, petFeeds: [], petInventory: { treat: 5, kibble: 3, can: 2 }, petRequests: new Map(), petFailAfterFeedOnce: false,
    }
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => localStorage.setItem('token', 'isolated-test-token'))
    await page.route('https://tiles.openfreemap.org/**', route => route.abort())
    // Every /api request is intercepted; tests never contact a running real backend.
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
      if (state.fail.has(path)) return route.abort()
      const json = data => route.fulfill({ json: data })
      if (path === '/wedding/cats') return json({ cats: state.weddingCats })
      if(path==='/wedding/people'){
        state.weddingPeopleReads++;
        const username=state.profileUsername||(state.admin?'测试管理员':'测试访客');
        const people=structuredClone(state.weddingPeople||[
          {username:state.weddingRole==='groom'?username:'owner-groom',name:state.weddingRole==='groom'&&state.nickname?state.nickname:'琪琪',role:'groom',persona:'guest',appearance:null},
          {username:state.weddingRole==='bride'?username:'owner-bride',name:state.weddingRole==='bride'&&state.nickname?state.nickname:'妮妮',role:'bride',persona:'guest',appearance:null},
          {username:'shenqidayang',name:'shenqidayang',role:null,persona:'calm-girl',appearance:null},
          {username:'lqc',name:'lqc',role:null,persona:'lively-boy',appearance:null},
        ]);
        if(!people.some(p=>p.username===username))people.push({username,name:state.nickname||username,role:state.weddingRole,persona:'guest',appearance:state.weddingWardrobe.appearance});
        return json({people});
      }
      if(path==='/wedding/wardrobe'){
        if(req.method()==='GET')state.wardrobeReads++;
        if(req.method()==='PUT'){state.weddingWardrobe.appearance=req.postDataJSON().appearance;state.weddingWardrobe.revision++;state.wardrobeWrites++;}
        return route.fulfill({json:state.weddingWardrobe,headers:{ETag:`"wardrobe-${state.weddingWardrobe.revision}"`}})
      }
      if(path==='/wedding/wardrobe/outfits'&&req.method()==='POST'){
        const item={...req.postDataJSON(),id:`outfit-${state.weddingWardrobe.revision+1}`};state.weddingWardrobe.outfits.push(item);state.weddingWardrobe.revision++;return json(state.weddingWardrobe)
      }
      if(path.startsWith('/wedding/wardrobe/outfits/')&&req.method()==='DELETE'){
        const id=path.split('/').at(-1);state.weddingWardrobe.outfits=state.weddingWardrobe.outfits.filter(p=>p.id!==id);state.weddingWardrobe.revision++;return json(state.weddingWardrobe)
      }
      if (path === '/pet/weather') return state.admin ? json({ weather: state.weather = field(req, 'weather') }) : route.fulfill({ status: 403 })
      if (path === '/pet/activity') {
        const offset = url.searchParams.get('cursor') ? state.petFeeds.findIndex(item => String(item.id) === url.searchParams.get('cursor')) + 1 : 0
        const data = state.petFeeds.slice(offset, offset + 20)
        return json({ data, next_cursor: offset + 20 < state.petFeeds.length ? String(data.at(-1).id) : null })
      }
      if (path === '/pet' || path === '/pet/feed' || path === '/pet/reward-feed') {
        const petState = () => ({ weather: state.weather, viewer_id: state.viewerId, is_admin: state.admin, can_spend_personal: !state.admin && state.allowedPages.includes('/pet'), own_inventory: { ...state.petInventory }, partner_inventory: { treat: 0, kibble: 0, can: 0 }, partner_name: '测试乙', id: 'liuyi', name: '六一', joined_at: '2026-10-28 12:00:00', can_feed: state.petCanFeed,
          personal_treats: state.personalTreats, reward_claimed_today: state.rewardClaimed, inventory: state.admin ? { ...state.petInventory } : null, feed_count: state.petFeeds.length, last_fed_at: state.petFeeds[0]?.created_at || null, activity: state.petFeeds.slice(0, 3) })
        if (path === '/pet') return json(petState())
        const personal = path === '/pet/reward-feed'
        if (!personal && !state.petCanFeed) return route.fulfill({ status: 403, json: { detail: '投喂只对情侣双方开放' } })
        const food = personal ? 'treat' : field(req, 'food'), key = field(req, 'request_key')
        const existing = state.petRequests.get(key)
        if (existing) return json({ event_id: existing.id, replayed: true, pet: petState() })
        if (!(personal ? state.personalTreats : state.petInventory[food])) return route.fulfill({ status: 409, json: { detail: '食物已经吃完啦' } })
        if (personal) state.personalTreats--; else state.petInventory[food]--
        const event = { id: state.petFeeds.length + 1, actor_name: state.nickname || '测试甲', kind: personal ? 'reward_feed' : 'feed', food, quantity: -1, created_at: '2026-10-28 12:10:00' }
        state.petFeeds.unshift(event); state.petRequests.set(key, event)
        if (state.petFailAfterFeedOnce) { state.petFailAfterFeedOnce = false; return route.abort() }
        return json({ event_id: event.id, replayed: false, pet: petState() })
      }
      if (path === '/account/nickname') { state.nickname = field(req, 'nickname'); return json({ nickname: state.nickname, display_name: state.nickname }) }
      if (path === '/me') return json({ nickname: state.nickname, display_name: state.nickname || state.profileUsername || (state.admin ? '测试管理员' : '测试访客'), username: state.profileUsername || (state.mailbox ? state.mailboxUsername : state.admin ? '测试管理员' : '测试访客'), is_admin: state.admin, wedding_role:state.weddingRole, allowed_pages: state.allowedPages, has_mailbox: state.mailbox })
      if (path.startsWith('/mailbox/')) {
        if (!state.mailbox) return route.fulfill({ status: 403, json: { detail: '此信箱仅限情侣双方使用' } })
        const own = letter => letter.sender_name === state.mailboxUsername
        const countReplies = letter => letter.comments.filter(comment => comment.author !== state.mailboxUsername && comment.id > (letter.seen || 0)).length
        const meta = letter => ({ id: letter.id, kind: letter.kind, title: letter.title, sender_name: letter.sender_name, recipient_name: letter.recipient_name, created_at: letter.created_at, recipient_read_at: letter.recipient_read_at, is_sender: own(letter), unread: !own(letter) && !letter.recipient_read_at, new_comments: countReplies(letter) })
        const summary = () => ({ unread_letters: state.mailboxLetters.filter(letter => !own(letter) && !letter.recipient_read_at).length,
          pending_sent: state.mailboxLetters.filter(letter => own(letter) && !letter.recipient_read_at).length,
          unread_reply_threads: state.mailboxLetters.filter(letter => countReplies(letter) > 0).length,
          username: state.mailboxUsername, partner: state.mailboxPartner, partner_ready: true })
        if (path === '/mailbox/summary') return json(summary())
        if (path === '/mailbox/letters' && req.method() === 'GET') {
          const sent = url.searchParams.get('box') === 'sent', page = Number(url.searchParams.get('page') || 1)
          const letters = state.mailboxLetters.filter(letter => own(letter) === sent).slice().reverse()
          return json({ data: letters.slice((page - 1) * 20, page * 20).map(meta), total: letters.length, page, page_size: 20 })
        }
        if (path === '/mailbox/letters' && req.method() === 'POST') {
          const key = field(req, 'request_key')
          let awarded = 0
          let letter = state.mailboxLetters.find(letter => letter.request_key === key)
          const replayed = !!letter
          if (!letter) {
            letter = { id: state.mailboxLetters.length + 1, sender_name: state.mailboxUsername, recipient_name: state.mailboxPartner,
              title: field(req, 'title'), body: field(req, 'body'), kind: field(req, 'kind'), request_key: key,
              created_at: '2026-10-28 09:00:00', recipient_read_at: null, comments: [] }
            state.mailboxLetters.push(letter)
            if (!state.letterRewarded) { awarded = 1; state.letterRewarded = true; state.petInventory.treat++ }
          }
          if (state.mailboxFailAfterSendOnce) { state.mailboxFailAfterSendOnce = false; return route.abort() }
          return json({ id: letter.id, replayed, food_reward: { food: 'treat', amount: awarded } })
        }
        const id = Number(path.split('/')[3]), letter = state.mailboxLetters.find(letter => letter.id === id)
        if (!letter) return route.fulfill({ status: 404, json: { detail: '信件不存在' } })
        if (path.endsWith('/read')) {
          if (!own(letter)) letter.recipient_read_at ||= '2026-10-28 09:10:00'
          letter.seen = Math.max(letter.seen || 0, Number(field(req, 'through_comment_id')))
          return json({ recipient_read_at: letter.recipient_read_at, summary: summary() })
        }
        if (path.endsWith('/comments')) {
          const key = field(req, 'request_key')
          let comment = letter.comments.find(comment => comment.request_key === key)
          if (!comment) {
            comment = { id: letter.comments.length + 1, content: field(req, 'content'), author: state.mailboxUsername, created_at: '2026-10-28 09:11:00', request_key: key }
            letter.comments.push(comment)
          }
          return json({ id: comment.id })
        }
        return json({ ...meta(letter), body: letter.body, comments: letter.comments.map(comment => ({ ...comment, is_mine: comment.author === state.mailboxUsername })), last_comment_id: letter.comments.at(-1)?.id || 0 })
      }
      if (path === '/photos' && req.method() === 'GET') return json({ data: state.photos })
      if (path === '/photos' && req.method() === 'POST') {
        const id = Math.max(0, ...state.photos.map(photo => photo.id)) + 1
        const photo = { id, caption: field(req, 'caption'), width: 600, height: 800, source: 'upload', url: `/api/photos/${id}/image`, thumbnail_url: `/api/photos/${id}/thumbnail` }
        state.photos.unshift(photo)
        return route.fulfill({ status: 201, json: { data: photo } })
      }
      if (/^\/photos\/\d+\/(image|thumbnail)$/.test(path)) return route.fulfill({ path: imagePath, contentType: 'image/webp' })
      if (/^\/photos\/\d+$/.test(path) && req.method() === 'DELETE') {
        const id = Number(path.split('/')[2]); state.deleted.push(id); state.photos = state.photos.filter(photo => photo.id !== id)
        return json({ status: 'success' })
      }
      if (path === '/blessings' && req.method() === 'GET') return json({ data: state.blessings })
      if (path === '/blessings') {
        const key = field(req, 'request_key')
        if (key && state.blessingRequests.has(key)) {
          const rewarded = state.blessingRequests.get(key)
          return json({ status: 'success', treat_reward: rewarded, replayed: true, reward_status: rewarded ? 'confirmed' : 'confirmed_without_reward' })
        }
        const reward = state.admin || state.rewardClaimed ? 0 : 1
        if (!state.admin) state.rewardClaimed = true
        state.personalTreats += reward
        if (key) state.blessingRequests.set(key, reward)
        state.blessings.unshift({ content: field(req, 'content'), author: state.nickname || '测试访客' })
        return json({ status: 'success', treat_reward: reward, reward_status: reward ? 'granted' : state.admin ? 'none' : 'already_claimed' })
      }
      if (path === '/story') {
        if (req.method() === 'PUT') {
          state.story = { ...state.story, title: field(req, 'title'), content: field(req, 'content'), version: state.story.version + 1 }
        }
        return json({ data: state.story })
      }
      if (path === '/journey-plans' && req.method() === 'GET') return json({ data: state.plans })
      if (path.startsWith('/journey-plans')) {
        if (!state.admin) return route.fulfill({ status: 403, json: { detail: '需要管理员权限' } })
        const id = Number(path.split('/')[2])
        const plan = state.plans.find(p => p.id === id)
        if (path.endsWith('/convert')) {
          const record = { id: Math.max(0, ...state.journeys.map(j => j.id)) + 1,
            name: JSON.parse(field(req, 'name')), adcodes: JSON.parse(field(req, 'adcodes')),
            departure_date: field(req, 'departure_date'), return_date: field(req, 'return_date'),
            checkin_points: field(req, 'checkin_points'), event: field(req, 'event'), notes: field(req, 'notes'), planning_reason: field(req, 'reason') || plan.reason }
          state.journeys.unshift(record); state.plans = state.plans.filter(p => p.id !== id)
          return json({ status: 'success', id: record.id })
        }
        if (req.method() === 'DELETE') { state.plans = state.plans.filter(p => p.id !== id); return json({ status: 'success' }) }
        const values = { name: JSON.parse(field(req, 'name')), adcodes: JSON.parse(field(req, 'adcodes')),
          checkin_points: field(req, 'checkin_points'), expected_departure: field(req, 'expected_departure'), reason: field(req, 'reason') }
        if (req.method() === 'PUT') Object.assign(plan, values)
        else state.plans.unshift({ id: Math.max(0, ...state.plans.map(p => p.id)) + 1, ...values })
        return json({ status: 'success' })
      }
      if (/^\/journeys\/[^/]+\/photos$/.test(path) && req.method() === 'GET') return json({ data: [] })
      if (path === '/journey-search') return json({ ids: state.journeys.filter(j => JSON.stringify(j).includes(url.searchParams.get('q'))).map(j => j.id) })
      if (path === '/journeys') return json({ data: state.journeys })
      if (path === '/table_data') return json({ data: state.todos.filter(todo => !todo.done) })
      if (path === '/table_done_list') return json({ data: state.todos.filter(todo => todo.done) })
      if (path === '/admin/users') return json({ data: [{ id: 1, username: '测试管理员', nickname: state.nickname || '琪琪', is_admin: true, userdate: '2026-01-01', login_count: 3 }, { id: 2, username: '来访朋友', is_admin: false, userdate: '2026-02-01', login_count: 1 }] })
      if (path === '/admin/owners') return json({ data: [{ username: '测试管理员', display_name: state.nickname || '琪琪' }, { username: '另一位主人', display_name: '妮妮' }], current_username: '测试管理员' })
      if (/^\/admin\/users\/\d+\/reset-password$/.test(path)) {
        const id = Number(path.split('/')[3]); state.passwordResets.push(id)
        return json({ status: 'success', self_reset: id === 1 })
      }
      if (path === '/admin/blessings') return json({ data: state.blessings.map((b, i) => ({ ...b, id: i + 1, created_at: '2026-01-01' })) })
      if (path === '/admin/todos') return json({ data: state.todos.filter(todo => todo.done === (url.searchParams.get('done') === 'true')) })
      if (/^\/admin\/todos\/\d+$/.test(path) && req.method() === 'PUT') {
        const todo = state.todos.find(todo => todo.id === Number(path.split('/')[3]))
        Object.assign(todo, { entry: field(req, 'entry'), type: field(req, 'type'), user: field(req, 'user') })
        return json({ status: 'success' })
      }
      if (/^\/admin\/todos\/\d+\/status$/.test(path)) {
        const todo = state.todos.find(todo => todo.id === Number(path.split('/')[3]))
        if (field(req, 'done') === 'true') todo.reflection = field(req, 'reflection')
        todo.done = field(req, 'done') === 'true'; todo.end_date = todo.done ? '2026-02-01' : null
        return json({ status: 'success' })
      }
      if (/^\/admin\/todos\/\d+\/reflection$/.test(path)) {
        const todo = state.todos.find(todo => todo.id === Number(path.split('/')[3]))
        todo.reflection = field(req, 'reflection')
        return json({ status: 'success' })
      }
      if (path === '/admin/settings/registration') {
        if (req.method() === 'PUT') { state.code = field(req, 'code'); state.revision++ }
        return json({ configured: !!state.code, source: state.editable ? 'file' : 'environment', editable: state.editable, revision: String(state.revision), ...(url.searchParams.get('reveal') === 'true' ? { code: state.code } : {}) })
      }
      return route.fulfill({ status: 404, json: { detail: `Unmocked request: ${path}` } })
    })
    await use(state)
    expect(errors).toEqual([])
  },
})

function field(request, name) {
  const raw = request.postData() || ''
  if (request.headers()['content-type']?.includes('multipart/form-data')) {
    const match = raw.match(new RegExp(`name="${name}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`))
    return match?.[1] || ''
  }
  return new URLSearchParams(raw).get(name) || ''
}
export { expect }
