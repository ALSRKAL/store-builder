import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Our type scale uses semantic font-size names (text-label, text-body, ...).
 * tailwind-merge treats unknown `text-*` classes as text colors, so it would
 * drop `text-primary-foreground` whenever a size class follows it. Registering
 * the custom scale keeps colors and sizes in their own groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'label', 'data'] }],
    },
  },
})

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
