import type { DateRange } from '~/types/notebook'

/** 月曆星期列，index 0 = 週一 */
export const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/** 依 getDay() 對應的中文星期，index 0 = 週日 */
const WEEKDAY_BY_DAY = ['日', '一', '二', '三', '四', '五', '六']

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 當地時間轉成 'YYYY-MM-DD' */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** 'YYYY-MM-DD' 轉成當地午夜的 Date */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** '2026-10-20' -> '10/20' */
export function formatDateLabel(key: string): string {
  const date = parseDateKey(key)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function weekdayLabel(date: Date): string {
  return WEEKDAY_BY_DAY[date.getDay()]!
}

/** 回傳新的 Date，不修改原物件 */
export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export interface CalendarCell { date: Date; key: string; day: number; inCurrentMonth: boolean }

/** 產生月曆網格（一週從週一開始），month 從 0 開始 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((offset + daysInMonth) / 7) * 7
  const start = addDays(first, -offset)

  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i)
    return {
      date,
      key: formatDateKey(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month
    }
  })
}

/** 該週週一的當地午夜（週日屬於前一個週一開始的那週） */
export function startOfWeek(date: Date): Date {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return addDays(midnight, -((midnight.getDay() + 6) % 7))
}

function weekRangeFrom(monday: Date): DateRange {
  return { start: formatDateKey(monday), end: formatDateKey(addDays(monday, 6)) }
}

function monthRange(year: number, month: number): DateRange {
  return {
    start: formatDateKey(new Date(year, month, 1)),
    end: formatDateKey(new Date(year, month + 1, 0))
  }
}

/** 本週一 ~ 本週日 */
export function thisWeekRange(today: Date): DateRange {
  return weekRangeFrom(startOfWeek(today))
}

/** 本月 1 日 ~ 本月最後一天 */
export function thisMonthRange(today: Date): DateRange {
  return monthRange(today.getFullYear(), today.getMonth())
}

export function shiftRange(mode: 'week' | 'month', range: DateRange, delta: number): DateRange {
  const start = parseDateKey(range.start)
  if (mode === 'week') {
    return weekRangeFrom(addDays(start, delta * 7))
  }
  return monthRange(start.getFullYear(), start.getMonth() + delta)
}

/** 含頭含尾的天數 */
export function countDays(range: DateRange): number {
  const ms = parseDateKey(range.end).getTime() - parseDateKey(range.start).getTime()
  // 用 round 吸收日光節約時間造成的小時差
  return Math.round(ms / 86_400_000) + 1
}

export function formatRangeLabel(mode: 'week' | 'month', range: DateRange): string {
  const start = parseDateKey(range.start)
  if (mode === 'month') {
    return `${start.getFullYear()} 年 ${start.getMonth() + 1} 月`
  }
  const end = parseDateKey(range.end)
  const fmt = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(start)} – ${fmt(end)}`
}
