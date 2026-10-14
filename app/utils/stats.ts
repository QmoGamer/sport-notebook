import type { DateRange, LogEntry } from '~/types/notebook'

/** sportId、categoryId 為 '' 表示全部 */
export interface StatsFilter { range: DateRange; sportId: string; categoryId: string }
export interface CountItem { id: string; count: number }

export function filterLogs(logs: Record<string, LogEntry>, filter: StatsFilter): LogEntry[] {
  const { range, sportId, categoryId } = filter
  if (range.start > range.end) return []
  return Object.values(logs)
    .filter(log => log.date >= range.start && log.date <= range.end)
    .filter(log => !sportId || log.sportId === sportId)
    .filter(log => !categoryId || log.categoryId === categoryId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function countBy(entries: LogEntry[], field: 'sportId' | 'categoryId', order: string[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry[field], (counts.get(entry[field]) ?? 0) + 1)
  }
  const position = (id: string) => {
    const index = order.indexOf(id)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || position(a.id) - position(b.id))
}
