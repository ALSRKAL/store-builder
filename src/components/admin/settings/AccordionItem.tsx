import { memo, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { transition as motionTransition } from '../../../lib/motion';

interface AccordionItemProps {
  id: string;
  icon: LucideIcon;
  title: string;
  badge?: string | null;
  expanded: boolean;
  onToggle: () => void;
  sectionRef: (element: HTMLDivElement | null) => void;
  children: ReactNode;
}

/**
 * A ruled settings row. No card, no rounded corners, no tinted badge.
 */
export const AccordionItem = memo(function AccordionItem({
  icon: Icon,
  title,
  badge,
  expanded,
  onToggle,
  sectionRef,
  children,
}: AccordionItemProps) {
  return (
    <div ref={sectionRef} className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-1 py-3 text-start transition-colors hover:text-accent"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-fg-subtle" strokeWidth={1.75} aria-hidden />
          <span className="truncate text-body font-medium text-foreground">{title}</span>
          {badge ? (
            <span className="shrink-0 text-[11px] text-fg-subtle" data-numeric>
              — {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-fg-subtle transition-transform duration-200', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTransition.fast}
            className="overflow-hidden"
          >
            <div className="px-1 pb-6 ps-7">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
