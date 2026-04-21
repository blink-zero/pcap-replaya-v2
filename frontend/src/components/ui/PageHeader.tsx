import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Standardized page top block. Every page renders exactly one of these so
 *  typography and spacing stay consistent across the app. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6 ${className ?? ''}`}>
      <div className="min-w-0">
        {eyebrow !== undefined && (
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint font-medium mb-1">{eyebrow}</p>
        )}
        <h1 className="text-xl font-semibold text-ink tracking-tight">{title}</h1>
        {description !== undefined && (
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  )
}
