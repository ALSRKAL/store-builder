import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { dirProps } from '../../lib/rtl';

/**
 * Tabs — تبويبات موحّدة.
 *
 * التبويبات الحالية في `SettingsTab` تُبنى يدوياً بـ `div` + حالة محلية بلا
 * `role="tablist"` ولا تنقّل أسهم ولا رابط بين التبويب ومحتواه (`aria-controls`).
 * Radix يمنحنا ذلك + دعم لوحة المفاتيح (Home/End/الأسهم).
 *
 * RTL: `dir` صريح حتى ينقلب اتجاه الأسهم والأشرطة بشكل صحيح. الشريط السفلي
 * للتبويب النشط يُرسم بـ `after:` بمواضع منطقية (`inset-x-*`).
 */

const TabsRoot = TabsPrimitive.Root;

function Tabs(props: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsRoot {...dirProps()} {...props} />;
}

const tabsListVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      /** خط سفلي — للتبويبات الرئيسية في الصفحة */
      underline: 'w-full gap-1 border-b border-border',
      pill: 'gap-1 rounded-md bg-surface-sunken p-1',
      /** مقطع (Segmented) — للتبديل بين عرضين */
      segmented: 'gap-0.5 rounded-md border border-border bg-card p-0.5',
    },
  },
  defaultVariants: { variant: 'underline' },
});

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), 'overflow-x-auto scrollbar-hide', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const tabsTriggerVariants = cva(
  cn(
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'text-body font-medium text-fg-muted outline-none transition-colors',
    'hover:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'data-[state=active]:text-foreground',
  ),
  {
    variants: {
      variant: {
        underline: cn(
          'min-h-11 rounded-none px-4 pb-2.5 pt-2',
          'data-[state=active]:font-semibold',
          'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5',
          'after:bg-transparent data-[state=active]:after:bg-accent',
        ),
        pill: cn(
          'min-h-11 rounded-md px-3.5 py-1.5',
          'data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:shadow-xs',
        ),
        segmented: cn(
          'min-h-11 flex-1 rounded-md px-3.5 py-1.5',
          'data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary-foreground',
        ),
      },
    },
    defaultVariants: { variant: 'underline' },
  },
);

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 outline-none',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 duration-200',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };