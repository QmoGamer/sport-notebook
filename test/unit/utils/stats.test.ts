import { describe, expect, it } from 'vitest'
import { countBy, countDates, filterLogs, groupByDate } from '~/utils/stats'
import type { LogEntry } from '~/types/notebook'

let seq = 0
const log = (date: string, sportId: string, categoryId = 'practice'): LogEntry => {
  seq += 1
  return { id: `log-${seq}`, date, sportId, categoryId, note: '', createdAt: seq }
}

const entries = [
  log('2026-10-04', 'tt'),
  log('2026-10-05', 'tt'),
  log('2026-10-07', 'badminton', 'match'),
  log('2026-10-11', 'tt', 'match'),
  log('2026-10-11', 'badminton'),
  log('2026-10-12', 'tt'),
]
const logs: Record<string, LogEntry> = Object.fromEntries(entries.map(l => [l.id, l]))

const week = { start: '2026-10-05', end: '2026-10-11' }

describe('filterLogs', () => {
  it('日期含頭含尾；日期降冪，同一天依建立先後', () => {
    expect(filterLogs(logs, { range: week, sportId: '', categoryId: '' }).map(l => [l.date, l.sportId])).toEqual([
      ['2026-10-11', 'tt'],
      ['2026-10-11', 'badminton'],
      ['2026-10-07', 'badminton'],
      ['2026-10-05', 'tt'],
    ])
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

describe('countDates / groupByDate', () => {
  it('countDates 計算不重複的日期數', () => {
    const filtered = filterLogs(logs, { range: week, sportId: '', categoryId: '' })
    expect(filtered).toHaveLength(4)
    expect(countDates(filtered)).toBe(3)
    expect(countDates([])).toBe(0)
  })

  it('groupByDate 依日期分組並保留順序', () => {
    const groups = groupByDate(filterLogs(logs, { range: week, sportId: '', categoryId: '' }))
    expect(groups.map(g => [g.date, g.entries.length])).toEqual([
      ['2026-10-11', 2],
      ['2026-10-07', 1],
      ['2026-10-05', 1],
    ])
    expect(groups[0]!.entries.map(e => e.sportId)).toEqual(['tt', 'badminton'])
  })
})

describe('countBy', () => {
  it('只回傳有資料的項目，依次數降冪，相同時依 order', () => {
    const items = [log('a', 'x'), log('b', 'y'), log('c', 'y'), log('d', 'z')]
    expect(countBy(items, 'sportId', ['z', 'x', 'y', 'unused'])).toEqual([
      { id: 'y', count: 2 },
      { id: 'z', count: 1 },
      { id: 'x', count: 1 },
    ])
  })

  it('不在 order 裡的項目排在同次數的最後', () => {
    const items = [log('a', 'ghost'), log('b', 'x')]
    expect(countBy(items, 'sportId', ['x']).map(i => i.id)).toEqual(['x', 'ghost'])
  })
})
