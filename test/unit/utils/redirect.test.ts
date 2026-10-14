import { describe, expect, it } from 'vitest'
import { safeRedirect } from '~/utils/redirect'

describe('safeRedirect', () => {
  it('站內路徑原樣回傳', () => {
    expect(safeRedirect('/stats')).toBe('/stats')
    expect(safeRedirect('/settings?tab=1')).toBe('/settings?tab=1')
  })

  it('外部網址或非字串一律回到首頁', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(['/stats'])).toBe('/')
  })
})
