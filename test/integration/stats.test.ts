import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useCatalog } from '#imports'
import StatsPage from '~/pages/stats.vue'
import { catalogIds, freezeToday, registerAs, seedLog } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

const stat = (wrapper: Wrapper, key: string) => wrapper.find(`[data-stat="${key}"]`).text()
const dayRows = (wrapper: Wrapper) => wrapper.findAll('[data-day-row]')
const logRows = (wrapper: Wrapper) => wrapper.findAll('[data-log-row]')
const modeButton = (wrapper: Wrapper, label: string) => wrapper.findAll('button[aria-pressed]').find(b => b.text() === label)!

describe('統計頁', () => {
  let wrapper: Wrapper

  beforeEach(async () => {
    freezeToday()
    const user = await registerAs()
    await useCatalog().addSport('羽球', '#6366f1')
    await flushPromises()
    const { sportId, categoryId } = catalogIds()
    const badminton = useCatalog().sports.value.find(s => s.name === '羽球')!.id
    seedLog(user.uid, '2026-10-05', { sportId, categoryId, note: '多球練習' })
    seedLog(user.uid, '2026-10-07', { sportId: badminton, categoryId: 'other' })
    seedLog(user.uid, '2026-10-11', { sportId, categoryId: 'other' })
    seedLog(user.uid, '2026-10-11', { sportId: badminton, categoryId, note: '晚上加練' })
    seedLog(user.uid, '2026-10-12', { sportId, categoryId })
    seedLog(user.uid, '2026-09-20', { sportId: badminton, categoryId })
    wrapper = await mountSuspended(StatsPage, { route: '/stats', global: { stubs: { teleport: true } } })
    await flushPromises()
  })

  it('預設顯示上週一到上週日，次數與天數分開計算', () => {
    expect(wrapper.text()).toContain('2026/10/5 – 2026/10/11')
    expect(stat(wrapper, 'count')).toContain('4')
    expect(stat(wrapper, 'days')).toContain('3')
    expect(stat(wrapper, 'period')).toContain('7')
    expect(stat(wrapper, 'top')).toContain('桌球')
  })

  it('上一期、下一期切換週', async () => {
    await wrapper.find('[aria-label="上一期"]').trigger('click')
    expect(wrapper.text()).toContain('2026/9/28 – 2026/10/4')
    expect(wrapper.text()).toContain('這段期間沒有符合條件的紀錄')
    expect(wrapper.text()).toContain('沒有資料')
    expect(stat(wrapper, 'top')).toContain('—')

    await wrapper.find('[aria-label="下一期"]').trigger('click')
    await wrapper.find('[aria-label="下一期"]').trigger('click')
    expect(wrapper.text()).toContain('2026/10/12 – 2026/10/18')
    expect(dayRows(wrapper)).toHaveLength(1)
  })

  it('切到「月」預設上個月', async () => {
    await modeButton(wrapper, '月').trigger('click')
    expect(wrapper.text()).toContain('2026 年 9 月')
    expect(dayRows(wrapper)).toHaveLength(1)
    expect(stat(wrapper, 'top')).toContain('羽球')
  })

  it('自訂期間：開始晚於結束時顯示錯誤，列表為空', async () => {
    await modeButton(wrapper, '自訂').trigger('click')
    expect(dayRows(wrapper)).toHaveLength(3)
    await wrapper.find('#range-start').setValue('2026-10-12')
    await wrapper.find('#range-end').setValue('2026-10-01')
    expect(wrapper.find('[role="alert"]').text()).toBe('開始日期不能晚於結束日期')
    expect(dayRows(wrapper)).toHaveLength(0)
    expect(stat(wrapper, 'period')).toContain('—')
  })

  it('依運動、類型篩選', async () => {
    const { sportId } = catalogIds()
    await wrapper.find('#stats-sport').setValue(sportId)
    expect(logRows(wrapper)).toHaveLength(2)
    await wrapper.find('#stats-category').setValue('other')
    expect(logRows(wrapper)).toHaveLength(1)
    expect(stat(wrapper, 'count')).toContain('1')
    expect(stat(wrapper, 'days')).toContain('1')
  })

  it('長條圖顯示次數', () => {
    const sportChart = wrapper.find('[data-chart="sport"]').text()
    expect(sportChart).toContain('桌球')
    expect(sportChart).toContain('羽球')
    expect(sportChart).toContain('2 次')
    const categoryChart = wrapper.find('[data-chart="category"]').text()
    expect(categoryChart).toContain('其它')
    expect(categoryChart).toContain('練習')
  })

  it('列表依日期降冪分組，同一天的紀錄放在一起；點擊會打開該天的紀錄視窗', async () => {
    const list = dayRows(wrapper)
    expect(list.map(r => r.text().slice(0, 2))).toEqual(['11', '07', '05'])
    expect(list[0]!.text()).toContain('10月・週日')
    expect(list[0]!.findAll('[data-log-row]').map(r => r.text())).toEqual([
      expect.stringContaining('桌球'),
      expect.stringContaining('晚上加練'),
    ])
    expect(list[2]!.text()).toContain('多球練習')
    expect(wrapper.text()).toContain('共 4 筆')

    await list[2]!.trigger('click')
    expect(wrapper.text()).toContain('2026-10-05 運動紀錄')
  })
})
