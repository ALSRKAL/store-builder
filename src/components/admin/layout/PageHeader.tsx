import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

/**
 * PageHeader — page title, one-line description, and actions.
 *
 * No side accent bar: hierarchy comes from type size and the rule.
 */

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function PageHeader({ title, description, actions, className }: PageHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-h1 font-semibold leading-snug text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[70ch] text-label leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export default PageHeader;