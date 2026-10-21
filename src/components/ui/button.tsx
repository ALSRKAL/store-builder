import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

/**
 * Button — الزر الوحيد في المشروع.
 *
 * التغييرات في أساس التصميم:
 *   - كل الألوان من التوكنات (كانت `bg-indigo-700`, `border-slate-200`,
 *     `text-slate-800` مباشرة، وهي قيم لا تتبع أي نظام فتبقى ثابتة عند تغيير
 *     الهوية).
 *   - أهداف اللمس: الارتفاع الافتراضي 44px على الجوال (`h-11`) و40px على
 *     الشاشات الكبيرة — فيحصل الإصبع على الحد الموصى به دون تضخيم كثافة اللوحة
 *     على الديسكتوب.
 *   - `size="icon"` أصبح 44×44 لأن أزرار الأيقونات أكثر ما يُخطئ فيه الإصبع.
 */

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "transition-colors duration-150 ease-out-expo",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-light",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        /** Secondary is a quiet surface, not a second dark button. */
        secondary: "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-muted",
        outline:
          "border border-border bg-transparent text-foreground hover:border-border-strong hover:bg-muted",
        ghost: "text-fg-muted hover:bg-muted hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        store:
          "rounded-[var(--store-button-radius,4px)] bg-[var(--store-primary)] text-white hover:opacity-90",
      },
      size: {
        default: "h-11 px-4 text-label",
        sm: "h-11 rounded-md px-3 text-label",
        lg: "h-11 rounded-md px-6 text-body",
        xl: "h-12 rounded-md px-7 text-body",
        icon: "size-11 rounded-md",
        /** Kept for API compatibility; touch target remains 44px. */
        iconSm: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean | undefined
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }