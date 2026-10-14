export interface ConfirmOptions {
  title: string
  message: string
  /** 預設「刪除」 */
  confirmLabel?: string
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void
}

/** 以 Promise 呼叫全站共用的 ConfirmDialog */
export function useConfirm() {
  const request = useState<ConfirmRequest | null>('confirm', () => null)

  function answer(value: boolean) {
    const current = request.value
    if (!current) return
    request.value = null
    current.resolve(value)
  }

  function confirm(options: ConfirmOptions): Promise<boolean> {
    // 前一個還沒回答就視為取消
    answer(false)
    return new Promise<boolean>((resolve) => {
      request.value = {
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? '刪除',
        resolve
      }
    })
  }

  return { request, confirm, answer }
}
