import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  padding?: 'default' | 'sm' | 'none'
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

/**
 * Standard container for content. Replaces ad-hoc
 * `bg-zinc-900 border border-zinc-800 rounded-xl` blocks with a consistent
 * shell that has:
 *   - optional title / description / actions header row
 *   - configurable body padding
 *   - optional footer strip
 */
export function Panel({
  title,
  description,
  actions,
  footer,
  padding = 'default',
  className,
  bodyClassName,
  children,
}: PanelProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined

  const bodyPadding =
    padding === 'none' ? '' :
    padding === 'sm'   ? 'p-3' :
                         'p-5'

  return (
    <section
      className={cn(
        'bg-panel border border-line rounded-lg overflow-hidden',
        className,
      )}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-line-subtle">
          <div className="min-w-0">
            {title !== undefined && (
              <h2 className="text-sm font-semibold text-ink truncate">{title}</h2>
            )}
            {description !== undefined && (
              <p className="text-xs text-ink-faint mt-0.5 truncate">{description}</p>
            )}
          </div>
          {actions !== undefined && (
            <div className="shrink-0 flex items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      {children !== undefined && (
        <div className={cn(bodyPadding, bodyClassName)}>{children}</div>
      )}
      {footer !== undefined && (
        <footer className="px-5 py-3 border-t border-line-subtle bg-panel-sunken/40 text-xs text-ink-faint">
          {footer}
        </footer>
      )}
    </section>
  )
}
