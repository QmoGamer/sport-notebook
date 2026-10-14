import { describe, expect, it } from 'vitest'
import { isHexColor, readableTextColor } from '~/utils/colors'

describe('isHexColor', () => {
  it('只接受 #rrggbb', () => {
    expect(isHexColor('#10b981')).toBe(true)
    expect(isHexColor('#10B981')).toBe(true)
    expect(isHexColor('#10b98')).toBe(false)
    expect(isHexColor('10b981')).toBe(false)
  })
})

describe('readableTextColor', () => {
  it('依背景亮度選擇白字或深色字', () => {
    expect(readableTextColor('#10b981')).toBe('#ffffff')
    expect(readableTextColor('#94a3b8')).toBe('#0f172a')
    expect(readableTextColor('#f59e0b')).toBe('#0f172a')
    expect(readableTextColor('#000000')).toBe('#ffffff')
    expect(readableTextColor('#ffffff')).toBe('#0f172a')
  })
})
