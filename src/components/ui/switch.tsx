import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"

/**
 * Switch — مفتاح تبديل على أساس Radix.
 *
 * لماذا الاستبدال: النسخة السابقة كانت `<label>` + `<input type="checkbox">`
 * مخفي بصرياً، مع كرة تُحرَّك بـ `-translate-x-5`. هذا يعني:
 *   - لا `role="switch"` ولا `aria-checked` (قارئ الشاشة يعلن "خانة اختيار").
 *   - الحركة ثابتة على اتجاه واحد، فتظهر معكوسة في RTL (وهي واجهة المشروع).
 *   - لا دعم للتنقّل بين المفاتيح كمجموعة ولا لـ `required`/`value`.
 *
 * Radix يمنحنا `role="switch"` و`aria-checked` وإدارة التركيز والكيبورد.
 *
 * RTL: الكرة تتحرك فيزيائياً لليسار في RTL ولليمين في LTR. استخدمنا
 * مُعدِّلَي `rtl:`/`ltr:` (معرَّفان في tailwind.config.js) بدل الاعتماد على
 * الخصائص المنطقية، لأن `translate-x` فيزيائي بطبيعته.
 */

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "className"> {
  className?: string
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      // الهدف الكامل 44px لمساً، والحلقة المرئية 24×44 داخله
      "group peer inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center",
      "rounded-full outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span
      aria-hidden
      className={cn(
        "relative flex h-6 w-11 items-center rounded-full border-2 border-transparent p-0.5",
        "transition-colors duration-200 ease-out-expo",
        "group-data-[state=checked]:bg-primary group-data-[state=unchecked]:bg-input"
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-5 rounded-full bg-white shadow-sm ring-0",
          "transition-transform duration-200 ease-out-expo",
          "group-data-[state=unchecked]:translate-x-0",
          "ltr:group-data-[state=checked]:translate-x-5",
          "rtl:group-data-[state=checked]:-translate-x-5"
        )}
      />
    </span>
  </SwitchPrimitive.Root>
))
Switch.displayName = "Switch"

export { Switch }