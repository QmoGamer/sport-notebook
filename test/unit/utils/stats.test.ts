import { describe, expect, it } from 'vitest'
import { countBy, filterLogs } from '~/utils/stats'
import type { LogEntry } from '~/types/notebook'

const log = (date: string, sportId: string, categoryId = 'practice'): LogEntry => ({ date, sportId, categoryId, note: '' })

const logs: Record<string, LogEntry> = Object.fromEntries([
  log('2026-10-04', 'tt'),
  log('2026-10-05', 'tt'),
  log('2026-10-07', 'badminton', 'match'),
  log('2026-10-11', 'tt', 'match'),
  log('2026-10-12', 'tt'),
].map(l => [l.date, l]))

const week = { start: '2026-10-05', end: '2026-10-11' }

describe('filterLogs', () => {
  it('日期含頭含尾，依日期降冪', () => {
    expect(filterLogs(logs, { range: week, sportId: '', categoryId: '' }).map(l => l.date))
      .toEqual(['2026-10-11', '2026-10-07', '2026-10-05'])
  })

  it('依運動、類型篩選', () => {
    expect(filterLogs(logs, { range: week, sportId: 'tt', categoryId: '' })).toHaveLength(2)
    expect(filterLogs(logs, { range: week, sportId: '', categoryId: 'match' })).toHaveLength(2)
    expect(filterLogs(logs, { range: week, sportId: 'tt', categoryId: 'match' }).map(l => l.date)).toEqual(['2026-10-11'])
  })

  it('開始日期晚於結束日期時回傳空陣列', () => {
    expect(filterLogs(logs, { range: { start: '2026-10-11', end: '2026-10-05' }, sportId: '', categoryId: '' })).toEqual([])
  })
})

describe('countBy', () => {
  it('只回傳有資料的項目，依次數降冪，相同時依 order', () => {
    const entries = [log('a', 'x'), log('b', 'y'), log('c', 'y'), log('d', 'z')]
    expect(countBy(entries, 'sportId', ['z', 'x', 'y', 'unused'])).toEqual([
      { id: 'y', count: 2 },
      { id: 'z', count: 1 },
      { id: 'x', count: 1 },
    ])
  })

  it('不在 order 裡的項目排在同次數的最後', () => {
    const entries = [log('a', 'ghost'), log('b', 'x')]
    expect(countBy(entries, 'sportId', ['x']).map(i => i.id)).toEqual(['x', 'ghost'])
  })
})
