import { test, expect } from '../fixtures/app.mjs'

async function ready(page) {
  await page.goto('/journey')
  await page.waitForFunction(() => {
    const s = document.querySelector('.map-container')?.__vueParentComponent?.setupState
    return s?.cityLayers?.has('330100') && !s.loading
  })
}
async function clickRegion(page, code, province = false) {
  await page.evaluate(({ code, province }) => {
    const s = document.querySelector('.map-container').__vueParentComponent.setupState
    ;(province ? s.provinceLayers : s.cityLayers).get(code).fire('click')
  }, { code, province })
}
async function close(page) {
  await page.locator('.journey-modal__foot').getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('.journey-modal-card')).not.toBeVisible()
}

test('province and city defaults are editable; planned layers follow edited destinations and cancellation', async ({ page, app }) => {
  app.admin = true
  await ready(page)
  await clickRegion(page, '330000', true)
  await page.getByRole('button', { name: '预定旅程', exact: true }).click()
  await expect(page.locator('#journey-province')).toHaveValue('33')
  await expect(page.locator('.selected-city')).toHaveCount(0)
  await page.locator('#journey-city').selectOption('330100')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await page.locator('#checkin-points').fill('西湖')
  await page.locator('#plan-reason').fill('一起看秋天')
  await page.getByRole('button', { name: '保存预定', exact: true }).click()
  await expect.poll(() => app.plans.length).toBe(1)
  expect(app.plans[0].expected_departure).toBe('')
  await expect(page.locator('.journey-summary')).toContainText('1 段旅程')
  await expect.poll(() => page.evaluate(() => {
    const s = document.querySelector('.map-container').__vueParentComponent.setupState
    const layer = s.plannedGroup.getLayers()[0]
    return [layer?.feature.properties.adcode.toString(), layer?.options.fillOpacity,
      Number(s.map.getPane('plannedCities').style.zIndex) > Number(s.map.getPane('countryOutline').style.zIndex)]
  })).toEqual(['330100', 0.4, true])
  await clickRegion(page, '330100')
  await expect(page.locator('#plan-reason')).toHaveValue('一起看秋天')
  await page.getByRole('button', { name: '移除杭州市', exact: true }).click()
  await page.locator('#journey-province').selectOption('31')
  await expect(page.locator('#journey-city')).toHaveValue('')
  await page.locator('#journey-city').selectOption('310000')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await page.getByRole('button', { name: '修改保存', exact: true }).click()
  await expect.poll(() => app.plans[0].adcodes).toEqual(['310000'])
  await expect.poll(() => page.evaluate(() => document.querySelector('.map-container').__vueParentComponent.setupState.plannedGroup.getLayers().map(l => String(l.feature.properties.adcode)))).toEqual(['310000'])
  await clickRegion(page, '310000')
  await page.getByRole('button', { name: '取消预定', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect.poll(() => app.plans.length).toBe(0)
  await expect.poll(() => page.evaluate(() => document.querySelector('.map-container').__vueParentComponent.setupState.plannedGroup.getLayers().length)).toBe(0)
})

test('conversion preserves all cities and reason, supports typed dates and cancellation', async ({ page, app }) => {
  app.admin = true
  app.plans = [{ id: 1, name: ['杭州市', '上海市'], adcodes: ['330100', '310000'], checkin_points: '西湖', expected_departure: '2026-11-01', reason: '一起看秋天' }]
  await ready(page)
  await clickRegion(page, '330100')
  await expect(page.locator('.selected-city')).toHaveCount(2)
  await expect(page.locator('#expected-departure')).toHaveValue('2026/11/01')
  await page.getByRole('button', { name: '转为旅程', exact: true }).click()
  await close(page)
  expect(app.plans).toHaveLength(1)
  await clickRegion(page, '330100')
  await page.getByRole('button', { name: '转为旅程', exact: true }).click()
  await expect(page.locator('#departure')).toHaveValue('2026/11/01')
  await page.locator('#departure').fill('2026/11/02')
  await page.locator('#departure').press('Enter')
  await page.locator('#return').fill('2026/11/05')
  await page.locator('#return').press('Enter')
  await page.locator('#notes').fill('看到了漂亮的秋景')
  await page.getByRole('button', { name: '保存为旅程', exact: true }).click()
  await expect.poll(() => app.plans.length).toBe(0)
  expect(app.journeys[0]).toMatchObject({ adcodes: ['330100', '310000'], departure_date: '2026-11-02', return_date: '2026-11-05', planning_reason: '一起看秋天', notes: '看到了漂亮的秋景' })
  await expect(page.locator('.journey-record')).toHaveCount(2)
  await page.locator('.journey-record').first().click()
  await expect(page.locator('.memory-details')).toContainText('一起看秋天')
})

test('whitelisted guests can inspect plans and memories but cannot edit or convert', async ({ page, app }) => {
  app.allowedPages = ['/index', '/journey']
  app.plans = [{ id: 1, name: ['杭州市'], adcodes: ['330100'], checkin_points: '西湖', expected_departure: '', reason: '看秋天' }]
  await ready(page)
  await clickRegion(page, '330100')
  await expect(page.locator('.journey-readonly')).toContainText('时间待定')
  await expect(page.getByRole('button', { name: '转为旅程', exact: true })).toHaveCount(0)
  await expect(page.locator('#plan-reason')).toHaveCount(0)
  await page.getByRole('button', { name: '旅行回忆', exact: true }).click()
  await expect(page.locator('.memory')).toContainText('一起看日落')
})

test('memories collapse on desktop and mobile, and search runs over all records', async ({ page, app }) => {
  app.admin = true
  app.journeys = Array.from({ length: 9 }, (_, i) => ({ ...app.journeys[0], id: i+1, notes: `旅程${i+1}` }))
  await ready(page)
  await expect(page.locator('.journey-record')).toHaveCount(6)
  await page.getByRole('button', { name: '显示全部（共 9 段回忆）' }).click()
  await expect(page.locator('.journey-record')).toHaveCount(9)
  await page.getByRole('button', { name: '收起', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.journey-record')).toHaveCount(3)
  await page.getByRole('searchbox').fill('旅程9')
  await expect(page.locator('.journey-record')).toHaveCount(1)
  await expect(page.locator('.journey-record')).toContainText('旅程9')
})

test('top plan layer supports actual map clicks without blocking other cities; mobile form fits', async ({ page, app }) => {
  app.admin = true
  app.plans = [{ id: 1, name: ['杭州市'], adcodes: ['330100'], checkin_points: '西湖', expected_departure: '2026-11-01', reason: '看秋天' }]
  await ready(page)
  for (const [lat, lng, title] of [[32.06, 118.8, '记录旅程'], [30.27, 120.15, '编辑预定旅程']]) {
    await page.evaluate(({ lat, lng }) => { document.querySelector('.map-container').__vueParentComponent.setupState.map.setView([lat, lng], 8, { animate: false }) }, { lat, lng })
    await page.locator('.map-container').scrollIntoViewIfNeeded()
    const rect = await page.locator('.map-container').boundingBox()
    await page.mouse.click(rect.x + rect.width/2, rect.y + rect.height/2)
    await expect(page.locator('.journey-modal__head h4')).toHaveText(title)
    await close(page)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await clickRegion(page, '330100')
  await expect(page.locator('#journey-city')).toHaveValue('330100')
  await page.locator('#expected-departure').click()
  await expect(page.locator('.el-picker-panel')).toBeVisible()
  await expect(page.locator('.el-picker__popper')).toHaveCSS('opacity', '1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../artifacts/journey-plan-mobile.png' })
})
