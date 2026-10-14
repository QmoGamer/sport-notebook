import { describe, expect, it } from 'vitest'
import { authErrorMessage, errorMessage } from '~/utils/error'

const withCode = (code: string) => Object.assign(new Error(code), { code })

describe('errorMessage', () => {
  it('Error 取 message，其他轉成字串', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage(new TypeError('type'))).toBe('type')
    expect(errorMessage('text')).toBe('text')
    expect(errorMessage(42)).toBe('42')
    expect(errorMessage(null)).toBe('null')
    expect(errorMessage(undefined)).toBe('undefined')
  })
})

describe('authErrorMessage', () => {
  it('把 Firebase Auth 錯誤碼轉成中文', () => {
    const cases: [string, string][] = [
      ['auth/invalid-credential', 'Email 或密碼錯誤'],
      ['auth/wrong-password', 'Email 或密碼錯誤'],
      ['auth/user-not-found', 'Email 或密碼錯誤'],
      ['auth/email-already-in-use', '這個 Email 已經註冊過了'],
      ['auth/invalid-email', 'Email 格式不正確'],
      ['auth/weak-password', '密碼長度至少需要 6 個字元'],
      ['auth/too-many-requests', '嘗試次數過多，請稍後再試'],
      ['auth/network-request-failed', '網路連線失敗，請檢查網路'],
      ['auth/requires-recent-login', '請重新登入後再試'],
    ]
    for (const [code, message] of cases) expect(authErrorMessage(withCode(code))).toBe(message)
  })

  it('不認得的錯誤碼或沒有 code 時退回 errorMessage', () => {
    expect(authErrorMessage(withCode('auth/unknown'))).toBe('auth/unknown')
    expect(authErrorMessage(new Error('offline'))).toBe('offline')
    expect(authErrorMessage(null)).toBe('null')
  })
})
