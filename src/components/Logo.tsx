interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizeMap = {
  sm: { mark: 'h-7 w-7 text-sm', word: 'text-sm' },
  md: { mark: 'h-9 w-9 text-base', word: 'text-base' },
  lg: { mark: 'h-12 w-12 text-lg', word: 'text-xl' }
}

/**
 * Reusable logo treatment. Currently a text-based monogram placeholder —
 * swap the mark below for an <img> once a real logo asset exists, without
 * touching any call site.
 */
export function Logo({ size = 'md', showWordmark = true, className = '' }: LogoProps) {
  const s = sizeMap[size]
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${s.mark} flex shrink-0 items-center justify-center rounded-md bg-brand-600 font-serif font-semibold text-paper`}
        aria-hidden="true"
      >
        R
      </div>
      {showWordmark && (
        <span className={`${s.word} font-semibold leading-tight tracking-tight`}>
          Rubisco
          <span className="hidden font-normal text-ink/60 dark:text-paper/60 sm:inline">
            {' '}Medical Library
          </span>
        </span>
      )}
    </div>
  )
}
