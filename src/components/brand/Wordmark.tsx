/**
 * Wordmark — the platform signature.
 *
 * Latin wordmark in Alexandria with a single saffron square. No icon tile, no
 * rounded logo badge: the square is the mark.
 */

import { cn } from '../../lib/utils';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'ink' | 'paper';
  className?: string;
}

const sizeMap = {
  sm: 'text-[15px] gap-1',
  md: 'text-[18px] gap-1.5',
  lg: 'text-[22px] gap-2',
} as const;

export default function Wordmark({ size = 'md', tone = 'ink', className }: WordmarkProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-display font-semibold leading-none',
        sizeMap[size],
        tone === 'ink' ? 'text-foreground' : 'text-[var(--store-footer-text)]',
        className,
      )}
    >
      <span>StoreBuilder</span>
      <span
        aria-hidden
        className={cn(
          'inline-block shrink-0 bg-highlight',
          size === 'sm' ? 'size-1' : size === 'md' ? 'size-1.5' : 'size-2',
        )}
      />
    </span>
  );
}
