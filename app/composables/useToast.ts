export interface Toast { id: number; message: string; type: 'success' | 'error' }

let nextId = 0

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function show(message: string, type: Toast['type'], duration: number) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => dismiss(id), duration)
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => show(message, 'success', 2500),
    error: (message: string) => show(message, 'error', 4000)
  }
}
