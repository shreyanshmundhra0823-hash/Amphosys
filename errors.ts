/**
 * A small typed error so UI code can show a friendly message instead of a
 * raw stack trace, while still preserving the original cause for debugging.
 */
export class AppError extends Error {
  cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.cause = cause
  }
}

export function toFriendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    return 'Your device storage is full. Free up space and try again.'
  }
  return fallback
}
