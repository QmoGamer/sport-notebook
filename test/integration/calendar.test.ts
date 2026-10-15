import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useCatalog, useRouter } from '#imports'
import IndexPage from '~/pages/index.vue'
import { catalogIds, expectRoute, freezeToday, registerAs, seedLog } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

/** 2026/10 前面有 3 格 9 月 */
const dayCell = (wrapper: Wrapper, day: number) => wrapper.findAll('[aria-disabled]')[2 + day]!

async function mountCalendar() {
  return mountSuspended(IndexPage, { route: '/', global: { stubs: { teleport: true } } })
}

describe('月曆', () => {
  beforeEach(() => {
    freezeToday()
  })

  it('未登入打開需要登入的頁面會被導到登入頁', async () => {
    await useRouter().push('/stats')
    await expectRoute('/login?redirect=/stats')
  })

  it('預設顯示今天所在月份，從週一開始', async () => {
    await registerAs()
    const wrapper = await mountCalendar()
    expect(wrapper.text()).toContain('2026 年 10 月')
    expect(wrapper.findAll('.grid-cols-7')[0]!.text().startsWith('一')).toBe(true)
  })

  it('過去、今天、未來都可以點，非當月不能點', async () => {
    await registerAs()
    const wrapper = await mountCalendar()
    expect(dayCell(wrapper, 14).attributes('aria-disabled')).toBe('false')
    expect(dayCell(wrapper, 15).attributes('aria-disabled')).toBe('false')
    expect(dayCell(wrapper, 20).attributes('aria-disabled')).toBe('false')
    expect(wrapper.findAll('[aria-disabled]')[0]!.attributes('aria-disabled')).toBe('true')
    expect(dayCell(wrapper, 15).find('.bg-emerald-600').exists()).toBe(true)
  })

  it('有紀錄的格子顯示運動（運動顏色）、類型與筆記', async () => {
    const user = await registerAs()
    const { sportId, categoryId } = catalogIds()
    seedLog(user.uid, '2026-10-12', { sportId, categoryId, note: '反手拉' })
    const wrapper = await mountCalendar()
    await flushPromises()
    const cell = dayCell(wrapper, 12)
    expect(cell.text()).toContain('桌球')
    expect(cell.text()).toContain('練習')
    expect(cell.text()).toContain('反手拉')
    expect(cell.find('[style]').attributes('style')).toMatch(/#10b981|16, 185, 129/)
  })

  it('同一天多筆：最多顯示 2 個運動標籤，其餘顯示 +N，且不顯示類型與筆記', async () => {
    const user = await registerAs()
    const { sportId, categoryId } = catalogIds()
    seedLog(user.uid, '2026-10-12', { sportId, categoryId, note: '早上' })
    seedLog(user.uid, '2026-10-12', { sportId: 'other', categoryId, note: '中午' })
    seedLog(user.uid, '2026-10-12', { sportId, categoryId, note: '晚上' })
    seedLog(user.uid, '2026-10-12', { sportId, categoryId })
    seedLog(user.uid, '2026-10-13', { sportId, categoryId })
    seedLog(user.uid, '2026-10-13', { sportId: 'other', categoryId })
    const wrapper = await mountCalendar()
    await flushPromises()

    const busy = dayCell(wrapper, 12)
    expect(busy.findAll('[style]').map(t => t.text())).toEqual(['桌球', '其它'])
    expect(busy.text()).toContain('+2')
    expect(busy.text()).not.toContain('練習')
    expect(busy.text()).not.toContain('早上')

    const two = dayCell(wrapper, 13)
    expect(two.findAll('[style]')).toHaveLength(2)
    expect(two.text()).not.toContain('+')
  })

  it('掛載後才新增的紀錄與運動改名都會即時顯示', async () => {
    const user = await registerAs()
    const { sportId, categoryId } = catalogIds()
    const wrapper = await mountCalendar()

    seedLog(user.uid, '2026-10-20', { sportId, categoryId })
    await flushPromises()
    expect(dayCell(wrapper, 20).text()).toContain('桌球')

    await useCatalog().updateSport(sportId, { name: '乒乓球' })
    await flushPromises()
    expect(dayCell(wrapper, 20).text()).toContain('乒乓球')
  })

  it('點過去的日期會打開紀錄視窗', async () => {
    await registerAs()
    const wrapper = await mountCalendar()
    await dayCell(wrapper, 10).trigger('click')
    expect(wrapper.text()).toContain('2026-10-10 運動紀錄')
  })

  it('點非當月的格子不會打開視窗', async () => {
    await registerAs()
    const wrapper = await mountCalendar()
    await wrapper.findAll('[aria-disabled]')[0]!.trigger('click')
    expect(wrapper.text()).not.toContain('運動紀錄')
  })

  it('切換月份與回到今天', async () => {
    await registerAs()
    const wrapper = await mountCalendar()
    await wrapper.find('[aria-label="下個月"]').trigger('click')
    expect(wrapper.text()).toContain('2026 年 11 月')
    await wrapper.find('[aria-label="上個月"]').trigger('click')
    await wrapper.find('[aria-label="上個月"]').trigger('click')
    expect(wrapper.text()).toContain('2026 年 9 月')
    const today = wrapper.findAll('button').find(b => b.text() === '今天')!
    await today.trigger('click')
    expect(wrapper.text()).toContain('2026 年 10 月')
    vi.useRealTimers()
  })
})
