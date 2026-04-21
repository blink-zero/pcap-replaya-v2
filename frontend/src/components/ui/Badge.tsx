import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info'
type Size = 'xs' | 'sm'

interface BadgeProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  neutral: 'bg-panel-raised text-ink-muted ring-1 ring-inset ring-line',
  accent:  'bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/25',
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/25',
  warn:    'bg-warn/10 text-warn ring-1 ring-inset ring-warn/25',
  danger:  'bg-danger/10 text-danger ring-1 ring-inset ring-danger/25',
  info:    'bg-info/10 text-info ring-1 ring-inset ring-info/25',
}

const sizeStyles: Record<Size, string> = {
  xs: 'text-[10px] leading-4 px-1.5 py-0',
  sm: 'text-xs leading-5 px-2 py-0.5',
}

/** Compact status / label pill. Uses ring-inset for crisp 1px edges at any DPI. */
export function Badge({ variant = 'neutral', size = 'sm', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
