import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Input — حقل الإدخال الموحّد.
 *
 * كل الألوان من التوكنات (`border-border`, `bg-card`, `text-foreground`)،
 * والارتفاع 44px مطابق لحد اللمس، ونص الـ placeholder يستخدم `text-fg-subtle`
 * مع ملاحظة: هذه درجة رمادية خفيفة، فلا تعتمد عليها وحدها لنقل معلومة مهمة.
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-surface px-3.5 py-2",
          "text-body text-foreground transition-colors",
          "file:border-0 file:bg-transparent file:text-label file:font-medium file:text-foreground",
          "placeholder:text-fg-subtle hover:border-border-strong",
          "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }