import * as React from 'react'
import { cn } from '../../lib/utils'

type SectionCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string
}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ title, className, children, ...props }, ref) => (
    <section
      ref={ref}
      className={cn('grid gap-4 rounded-2xl border border-border/50 bg-background p-4', className)}
      {...props}
    >
      {title && (
        <div className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">
          {title}
        </div>
      )}
      {children}
    </section>
  ),
)
SectionCard.displayName = 'SectionCard'

export { SectionCard }
