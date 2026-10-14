/** 從 catch 到的任意值取出可顯示的錯誤訊息 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email 或密碼錯誤',
  'auth/wrong-password': 'Email 或密碼錯誤',
  'auth/user-not-found': 'Email 或密碼錯誤',
  'auth/email-already-in-use': '這個 Email 已經註冊過了',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/weak-password': '密碼長度至少需要 6 個字元',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試',
  'auth/network-request-failed': '網路連線失敗，請檢查網路',
  'auth/requires-recent-login': '請重新登入後再試'
}

/** Firebase Auth 錯誤轉成中文訊息；不認得的錯誤碼交給 errorMessage */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code]
  return errorMessage(error)
}
