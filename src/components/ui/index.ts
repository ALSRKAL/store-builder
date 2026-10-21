// =============================================================================
// مكتبة الواجهة الموحّدة (src/components/ui)
//
// كل ما يظهر للمستخدم من أزرار وحقول ونوافذ وقوائم وتنبيهات يجب أن يأتي من هنا
// لا من markup مكتوب يدوياً داخل الشاشات. الهدف: هوية واحدة، سلوك كيبورد موحّد،
// وأسماء منطقية (start/end) تعمل في RTL بلا استثناءات.
// =============================================================================

/* ===== الأساسيات ===== */
export { Button, buttonVariants, type ButtonProps } from './button'
export { Input, type InputProps } from './input'
export { Label, type LabelProps } from './label'
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
export { Badge, badgeVariants, type BadgeProps } from './badge'
export { Separator } from './separator'
export { Textarea, type TextareaProps } from './textarea'
export { Avatar, AvatarImage, AvatarFallback } from './avatar'
export { Progress } from './progress'
export { Alert, AlertTitle, AlertDescription } from './alert'
export { Switch } from './switch'

/* ===== النوافذ والطبقات (Radix) ===== */
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
  type DialogContentProps,
} from './dialog'
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  resolvePhysicalSide,
  sheetContentVariants,
  type SheetContentProps,
  type SheetSide,
} from './sheet'
export { ConfirmDialog, useConfirm, type ConfirmDialogProps } from './confirm-dialog'
export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, type TooltipProps } from './tooltip'

/* ===== القوائم والاختيار ===== */
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants } from './tabs'

/* ===== البيانات ===== */
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './table'

/* ===== التنبيهات والحالات ===== */
export { toast, Toaster, showToast, dismissToast, dismissAllToasts, useToastQueue, type ToastOptions } from './toaster'
export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastProviderRoot,
  toastVariants,
  type ToastProps,
  type ToastVariant,
} from './toast'
export { Spinner, spinnerVariants, type SpinnerProps } from './spinner'
export { EmptyState, type EmptyStateProps } from './empty-state'
export { ErrorState, type ErrorStateProps } from './error-state'

/* ===== هياكل التحميل ===== */
export { Skeleton } from './skeleton'
export {
  SkeletonText,
  SkeletonStatCard,
  SkeletonStatsRow,
  SkeletonProductCard,
  SkeletonProductGrid,
  SkeletonList,
  SkeletonTable,
  PageSkeleton,
  type SkeletonTextProps,
} from './skeleton-shell'