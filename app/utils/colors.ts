export const DEFAULT_SPORT_COLOR = '#10b981'
export const OTHER_SPORT_COLOR = '#94a3b8'
export const SPORT_COLOR_PRESETS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6']

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

/** 依背景色的 YIQ 亮度決定文字用深色或白色 */
export function readableTextColor(hex: string): '#ffffff' | '#0f172a' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? '#0f172a' : '#ffffff'
}
