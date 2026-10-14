export interface Sport { id: string; name: string; color: string; order: number }
export interface Category { id: string; name: string; order: number }
export interface LogEntry { date: string; sportId: string; categoryId: string; note: string }
export interface LogInput { sportId: string; categoryId: string; note: string }
/** 皆為 date key，含頭含尾 */
export interface DateRange { start: string; end: string }
export type PeriodMode = 'week' | 'month' | 'custom'
