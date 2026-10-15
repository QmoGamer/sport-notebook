import { describe, expect, it } from 'vitest'
import {
  WEEKDAYS, addDays, buildMonthGrid, countDays, formatDateKey, formatDateLabel, formatRangeLabel,
  pad2, parseDateKey, shiftRange, startOfWeek, thisMonthRange, thisWeekRange, weekdayLabel,
} from '~/utils/date'

describe('pad2', () => {
  it('個位數補零，兩位數以上不變', () => {
    expect(pad2(7)).toBe('07')
    expect(pad2(12)).toBe('12')
    expect(pad2(123)).toBe('123')
  })
})

describe('formatDateKey / parseDateKey', () => {
  it('以當地時間輸出，包含年底邊界', () => {
    expect(formatDateKey(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(formatDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('解析為當地午夜，且與 formatDateKey 互為反函數', () => {
    const date = parseDateKey('2026-10-20')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 20, 0])
    for (const key of ['2024-02-29', '2026-01-01', '2026-12-31']) {
      expect(formatDateKey(parseDateKey(key))).toBe(key)
    }
  })
})

describe('formatDateLabel', () => {
  it('去掉年份與前導零', () => {
    expect(formatDateLabel('2026-10-20')).toBe('10/20')
    expect(formatDateLabel('2026-01-05')).toBe('1/5')
  })
})

describe('weekdayLabel / WEEKDAYS', () => {
  it('依 getDay 對應中文星期', () => {
    expect(weekdayLabel(new Date(2026, 9, 18))).toBe('日')
    expect(weekdayLabel(new Date(2026, 9, 12))).toBe('一')
  })

  it('月曆星期列從週一開始、到週日結束', () => {
    expect(WEEKDAYS).toEqual(['一', '二', '三', '四', '五', '六', '日'])
  })
})

describe('addDays', () => {
  it('跨月、跨年、往前回到 2 月底', () => {
    expect(formatDateKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01')
    expect(formatDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
    expect(formatDateKey(addDays(new Date(2024, 2, 1), -1))).toBe('2024-02-29')
  })

  it('不修改原本的 Date', () => {
    const original = new Date(2026, 9, 15)
    addDays(original, 3)
    expect(formatDateKey(original)).toBe('2026-10-15')
  })
})

describe('buildMonthGrid', () => {
  it('2026/10 有 35 格，從週一 09-28 開始、到 11-01 結束', () => {
    const grid = buildMonthGrid(2026, 9)
    expect(grid).toHaveLength(35)
    expect(grid[0]!.key).toBe('2026-09-28')
    expect(grid.at(-1)!.key).toBe('2026-11-01')
    expect(grid.filter(c => c.inCurrentMonth)).toHaveLength(31)
    expect(grid.slice(0, 3).every(c => !c.inCurrentMonth)).toBe(true)
    expect(grid.at(-1)!.inCurrentMonth).toBe(false)
  })

  it('2027/02 有 28 格，全部都是當月', () => {
    const grid = buildMonthGrid(2027, 1)
    expect(grid).toHaveLength(28)
    expect(grid[0]!.key).toBe('2027-02-01')
    expect(grid.at(-1)!.key).toBe('2027-02-28')
    expect(grid.every(c => c.inCurrentMonth)).toBe(true)
  })

  it('2026/08 有 42 格，從 07-27 開始、到 09-06 結束', () => {
    const grid = buildMonthGrid(2026, 7)
    expect(grid).toHaveLength(42)
    expect(grid[0]!.key).toBe('2026-07-27')
    expect(grid.at(-1)!.key).toBe('2026-09-06')
  })

  it('每一格的 key、day、date 一致，每列第一格都是週一', () => {
    const grid = buildMonthGrid(2026, 9)
    for (const cell of grid) {
      expect(cell.key).toBe(formatDateKey(cell.date))
      expect(cell.day).toBe(cell.date.getDate())
    }
    for (let i = 0; i < grid.length; i += 7) expect(grid[i]!.date.getDay()).toBe(1)
  })
})

describe('期間函式', () => {
  it('startOfWeek：週四、週日、週一都回到同一個週一', () => {
    for (const day of [15, 18, 12]) {
      expect(formatDateKey(startOfWeek(new Date(2026, 9, day, 15, 30)))).toBe('2026-10-12')
    }
  })

  it('thisWeekRange、thisMonthRange 以 2026-10-15 計算', () => {
    const today = new Date(2026, 9, 15)
    expect(thisWeekRange(today)).toEqual({ start: '2026-10-12', end: '2026-10-18' })
    expect(thisMonthRange(today)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
  })

  it('今天是週日或週一時，本週仍是週一到週日', () => {
    expect(thisWeekRange(new Date(2026, 9, 18))).toEqual({ start: '2026-10-12', end: '2026-10-18' })
    expect(thisWeekRange(new Date(2026, 9, 12))).toEqual({ start: '2026-10-12', end: '2026-10-18' })
  })

  it('跨年：2026-01-01 的本週與本月', () => {
    const today = new Date(2026, 0, 1)
    expect(thisWeekRange(today)).toEqual({ start: '2025-12-29', end: '2026-01-04' })
    expect(thisMonthRange(today)).toEqual({ start: '2026-01-01', end: '2026-01-31' })
  })

  it('shiftRange：週加減 7 天；月份往前跨年、2 月天數正確', () => {
    const week = { start: '2026-10-05', end: '2026-10-11' }
    expect(shiftRange('week', week, 1)).toEqual({ start: '2026-10-12', end: '2026-10-18' })
    expect(shiftRange('week', week, -1)).toEqual({ start: '2026-09-28', end: '2026-10-04' })
    expect(shiftRange('month', { start: '2026-01-01', end: '2026-01-31' }, -1)).toEqual({ start: '2025-12-01', end: '2025-12-31' })
    expect(shiftRange('month', { start: '2026-03-01', end: '2026-03-31' }, -1)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('countDays 含頭含尾', () => {
    expect(countDays({ start: '2026-10-05', end: '2026-10-11' })).toBe(7)
    expect(countDays({ start: '2026-10-05', end: '2026-10-05' })).toBe(1)
    expect(countDays({ start: '2026-03-01', end: '2026-03-31' })).toBe(31)
  })

  it('formatRangeLabel：週用 en dash，月顯示年月', () => {
    expect(formatRangeLabel('week', { start: '2026-10-05', end: '2026-10-11' })).toBe('2026/10/5 – 2026/10/11')
    expect(formatRangeLabel('month', { start: '2026-09-01', end: '2026-09-30' })).toBe('2026 年 9 月')
  })
})
