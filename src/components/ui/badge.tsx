import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

/**
 * Badge — الشارة/الوسم الموحّد.
 *
 * المشكلة السابقة: `success/warning/info` كانت `bg-green-500 / bg-amber-500 /
 * bg-blue-500` مباشرة، أي تتجاهل توكنات `--success/--warning/--info` المعرّفة
 * في CSS. الآن كلها من التوكنات، وتستخدم صيغة `color-mix` المدعومة بالشفافية
 * فتعمل `bg-success/10`.
 *
 * أضفنا عائلة `soft-*` (خلفية ملوّنة خفيفة + نص ملوّن) لأن شرائح حالة الطلب
 * في OrdersManager تحتاج تمييزاً هادئاً لا كتلة لونية صارخة، وهو النمط الذي
 * كان يُكتب يدوياً في كل مرة.
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-surface text-foreground",
        destructive: "border-transparent bg-danger text-danger-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",

        /* Quiet variants for in-card labels and counts. */
        "soft-neutral": "border-border bg-surface-sunken text-fg-muted",
        "soft-primary": "border-border bg-surface-sunken text-foreground",
        "soft-success": "border-success/20 bg-success/10 text-success",
        "soft-warning": "border-warning/20 bg-warning/10 text-warning",
        "soft-danger": "border-danger/20 bg-danger/10 text-danger",
        "soft-info": "border-info/20 bg-info/10 text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }