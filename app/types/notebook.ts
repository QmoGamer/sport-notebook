export interface Sport { id: string; name: string; color: string; order: number }
export interface Category { id: string; name: string; order: number }
export interface LogEntry {
  /** Firestore 文件 ID（舊資料的 ID 是日期，新資料是自動 ID，一律當作不透明字串） */
  id: string
  date: string
  sportId: string
  categoryId: string
  note: string
  /** createdAt 的毫秒數，用來排同一天的先後；尚未取得時為 0 */
  createdAt: number
}
export interface LogInput { sportId: string; categoryId: string; note: string }
/** 皆為 date key，含頭含尾 */
export interface DateRange { start: string; end: string }
export type PeriodMode = 'week' | 'month' | 'custom'
