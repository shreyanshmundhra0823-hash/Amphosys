import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

const variantStyles = {
  success: { icon: CheckCircle2, className: 'border-green-200 bg-green-50 text-green-800' },
  error: { icon: AlertCircle, className: 'border-red-200 bg-red-50 text-red-800' },
  info: { icon: Info, className: 'border-ink/10 bg-white text-ink' }
}

export function ToastViewport() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:items-end">
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant]
        const Icon = style.icon
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg ${style.className}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
