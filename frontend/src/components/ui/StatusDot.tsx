import { cn } from '../../lib/utils'

type Variant = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info'

interface StatusDotProps {
  variant?: Variant
  pulsing?: boolean
  size?: number
  className?: string
  label?: string
}

const fills: Record<Variant, string> = {
  neutral: 'bg-ink-ghost',
  accent:  'bg-cyan-400',
  success: 'bg-success',
  warn:    'bg-warn',
  danger:  'bg-danger',
  info:    'bg-info',
}

/** Small colored dot, optionally pulsing. Used inline next to labels to
 *  convey state at a glance (replay running, interface up, etc.). */
export function StatusDot({ variant = 'neutral', pulsing, size = 8, className, label }: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={label ?? variant}
      className={cn(
        'relative inline-flex rounded-full shrink-0',
        fills[variant],
        className,
      )}
      style={{ width: size, height: size }}
    >
      {pulsing && (
        <span
          aria-hidden="true"
          className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', fills[variant])}
        />
      )}
    </span>
  )
}
