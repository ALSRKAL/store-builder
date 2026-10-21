/**
 * OrdersManager — إدارة الطلبات.
 *
 * أُعيد بناؤه على نظام التصميم:
 *   - كان يعتمد `var(--card-bg)` و`var(--border)` مع ألوان HEX مكتوبة في
 *     `style` لكل شارة، وشبكة إحصاءات بأربع بقع ألوان.
 *   - الآن: أسطح/حدود دلالية، شارات حالة بنقطة 6px، فلاتر pills بعدّادات
 *     `tabular-nums`، وأهداف لمس 44px.
 *   - الحالات الثلاث موجودة: هيكل تحميل، فراغ موحّد، وخطأ مع إعادة محاولة.
 *   - الحذف عبر `ConfirmDialog` (كان `window.confirm`)، والفشل عبر Toast
 *     (كان `alert`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  User,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatPrice } from '../../data/currencies';
import { updatePendingOrdersCount, resetReminder } from '../../utils/orderReminder';
import { fetchAllOrders } from '../../utils/orderUtils';
import type { Order, OrderStats } from '../../schemas/order';
import { cn } from '../../lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  EmptyState,
  ErrorState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SkeletonList,
  toast,
  useConfirm,
} from '../ui';

type OrderStatusKey = 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface StatusInfo {
  label: string;
  icon: LucideIcon;
  description: string;
  text: string;
  dot: string;
}

const ORDER_STATUSES: Record<OrderStatusKey, StatusInfo> = {
  new: { label: 'جديد', icon: Clock3, description: 'طلب جديد بانتظار المراجعة', text: 'text-warning', dot: 'bg-warning' },
  confirmed: { label: 'مؤكد', icon: CheckCircle2, description: 'تم تأكيد الطلب وقبوله', text: 'text-info', dot: 'bg-info' },
  processing: { label: 'قيد التجهيز', icon: Package, description: 'جاري تجهيز الطلب للشحن', text: 'text-fg-muted', dot: 'bg-fg-muted' },
  shipped: { label: 'تم الشحن', icon: Truck, description: 'تم شحن الطلب وفي الطريق', text: 'text-info', dot: 'bg-info' },
  delivered: { label: 'تم التسليم', icon: CheckCircle2, description: 'تم تسليم الطلب للعميل', text: 'text-success', dot: 'bg-success' },
  cancelled: { label: 'ملغي', icon: XCircle, description: 'تم إلغاء الطلب', text: 'text-danger', dot: 'bg-danger' },
};

interface ExtendedOrder extends Omit<Order, 'customer' | 'items'> {
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  customerNotes?: string | null;
  items: OrderItemUI[];
  itemsCount: number;
  paymentLabel?: string | null;
  paymentProviderId?: string | null;
  confirmedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

interface OrderItemUI {
  name: string;
  image?: string | null;
  selectedColor?: string | null;
  selectedSize?: string | null;
  quantity: number;
  price: number;
}

interface CachedData {
  loaded: boolean;
  data: ExtendedOrder[];
  stats: OrderStats | null;
}

interface OrdersManagerProps {
  currency?: string;
  cachedData?: CachedData | null;
  onDataUpdate?: (orders: ExtendedOrder[], stats: OrderStats) => void;
}

type FilterType = 'all' | OrderStatusKey;

const FILTERS: FilterType[] = ['all', 'new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA-u-nu-latn', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUIStatus(apiStatus: Order['status']): OrderStatusKey {
  const reverse: Record<Order['status'], OrderStatusKey> = {
    new: 'new',
    pending: 'new', // اسم قديم محفوظ في بعض الطلبات
    confirmed: 'confirmed',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
    refunded: 'cancelled',
  };
  return reverse[apiStatus] ?? 'new';
}

function StatusBadge({ status }: { status: OrderStatusKey }): React.JSX.Element {
  const info = ORDER_STATUSES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', info.text)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', info.dot)} />
      {info.label}
    </span>
  );
}

function OrdersManager({
  currency = 'YER',
  cachedData = null,
  onDataUpdate,
}: OrdersManagerProps): React.JSX.Element {
  const [orders, setOrders] = useState<ExtendedOrder[]>(cachedData?.data ?? []);
  const [stats, setStats] = useState<OrderStats | null>(cachedData?.stats ?? null);
  const [loading, setLoading] = useState(!cachedData?.loaded);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );

  const selectedRef = useRef<ExtendedOrder | null>(null);
  selectedRef.current = selectedOrder;
  // فشل تحديث خلفي لا يجب أن يمحو طلبات معروضة بالفعل.
  const hasOrdersRef = useRef(orders.length > 0);
  useEffect(() => {
    hasOrdersRef.current = orders.length > 0;
  }, [orders.length]);
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const listener = (event: MediaQueryListEvent): void => setIsDesktop(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const transformOrder = useCallback(
    (order: Order): ExtendedOrder => ({
      ...order,
      customerName: order.customerName || order.customer?.name || '',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      customerAddress: order.customerAddress ?? order.customer?.address ?? undefined,
      customerNotes: order.customerNotes ?? order.customer?.notes ?? undefined,
      items: order.items.map((item) => ({
        name: item.name || item.productName || '',
        image: item.image ?? item.productImage ?? undefined,
        selectedColor: item.selectedColor ?? item.color ?? undefined,
        selectedSize: item.selectedSize ?? item.size ?? undefined,
        quantity: item.quantity,
        price: item.price,
      })),
      itemsCount: order.itemsCount || order.items.length,
    }),
    [],
  );

  const fetchOrders = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (cachedData?.loaded && !forceRefresh) {
        setOrders(cachedData.data ?? []);
        setStats(cachedData.stats ?? null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [ordersList, statsData] = await Promise.all([fetchAllOrders(), api.orders.getStats()]);
        const list = Array.isArray(ordersList) ? ordersList : [];
        const transformed = list.map(transformOrder);
        setOrders(transformed);
        setStats(statsData);
        onDataUpdate?.(transformed, statsData);
        const previous = selectedRef.current;
        setSelectedOrder(previous ? transformed.find((order) => order.id === previous.id) ?? null : transformed[0] ?? null);
      } catch (error) {
        console.error('Error fetching orders:', error);
        if (!hasOrdersRef.current) {
          setLoadError(error instanceof Error ? error.message : 'تعذّر تحميل الطلبات.');
        }
      } finally {
        setLoading(false);
      }
    },
    [cachedData, onDataUpdate, transformOrder],
  );

  useEffect(() => {
    void fetchOrders();
    const intervalId = window.setInterval(() => void fetchOrders(true), 30_000);

    const handleSwMessage = (event: MessageEvent): void => {
      if (
        event.data?.type === 'NAVIGATE_TO_ORDERS' ||
        event.data?.type === 'new_order' ||
        event.data?.type === 'NEW_ORDER_RECEIVED'
      ) {
        void fetchOrders(true);
      }
    };
    const handleWindowMessage = (event: MessageEvent): void => {
      if (event.data?.type === 'NEW_ORDER_RECEIVED') void fetchOrders(true);
    };

    navigator.serviceWorker?.addEventListener('message', handleSwMessage);
    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.clearInterval(intervalId);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    setUpdating(orderId);
    try {
      await api.orders.updateStatus(orderId, { status });
      const updated = orders.map((order) =>
        order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order,
      );
      setOrders(updated);
      setSelectedOrder((current) => (current?.id === orderId ? { ...current, status } : current));
      // نحدّث العدادات من الخادم (وليس من أول 100 طلب فقط).
      try {
        const nextStats = await api.orders.getStats();
        setStats(nextStats);
        const newCount = nextStats.newOrders ?? 0;
        updatePendingOrdersCount(newCount);
        if (newCount === 0) resetReminder();
        onDataUpdate?.(updated, nextStats);
      } catch (statsError) {
        console.error('Error refreshing order stats:', statsError);
      }
      toast.success('تم تحديث حالة الطلب');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('تعذّر تحديث حالة الطلب');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: Order['paymentStatus']): Promise<void> => {
    setUpdating(orderId);
    try {
      // لا نرسل الحالة مع حالة الدفع: الخادم يعيد كتابة تواريخ التأكيد/الشحن/التسليم.
      await api.orders.updateStatus(orderId, {
        paymentStatus: paymentStatus ?? undefined,
      });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, paymentStatus } : order)));
      setSelectedOrder((state) => (state?.id === orderId ? { ...state, paymentStatus } : state));
      toast.success('تم تحديث حالة الدفع');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('تعذّر تحديث حالة الدفع');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteOrder = (order: ExtendedOrder): void => {
    ask({
      title: 'حذف الطلب',
      description: `سيُحذف الطلب #${order.orderNumber} نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف الطلب',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await api.orders.delete(order.id);
          const updated = orders.filter((item) => item.id !== order.id);
          setOrders(updated);
          setSelectedOrder((current) => (current?.id === order.id ? null : current));
          try {
            const nextStats = await api.orders.getStats();
            setStats(nextStats);
            updatePendingOrdersCount(nextStats.newOrders ?? 0);
            onDataUpdate?.(updated, nextStats);
          } catch (statsError) {
            console.error('Error refreshing order stats:', statsError);
          }
          toast.success('تم حذف الطلب');
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (!message.includes('غير موجود') && !message.includes('404')) {
            console.error('Error deleting order:', error);
            toast.error('تعذّر حذف الطلب');
          }
        }
      },
    });
  };

  const openWhatsApp = (phone: string, orderNumber: string): void => {
    const message = `مرحباً، بخصوص طلبك رقم ${orderNumber}`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== 'all' && getUIStatus(order.status) !== filter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Boolean(
        order.orderNumber?.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.customerPhone?.includes(query),
      );
    });
  }, [orders, filter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: orders.length,
      new: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of orders) counts[getUIStatus(order.status)] += 1;
    return counts;
  }, [orders]);

  const activeOrder =
    selectedOrder && filteredOrders.some((order) => order.id === selectedOrder.id)
      ? selectedOrder
      : isDesktop
        ? filteredOrders[0] ?? null
        : null;

  const selectOrder = (order: ExtendedOrder): void => {
    setSelectedOrder(order);
    setShowMobileDetail(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[84px] animate-pulse bg-card" />
          ))}
        </div>
        <SkeletonList count={6} />
        <span className="sr-only" role="status" aria-live="polite">جاري تحميل الطلبات…</span>
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="تعذّر تحميل الطلبات" description="لم نتمكن من الوصول إلى قائمة الطلبات. تحقّق من الاتصال وأعد المحاولة." onRetry={() => void fetchOrders(true)} />;
  }

  return (
    <div className="flex flex-col gap-4 pb-5">
      {dialog}

      {stats ? (
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {[
            { label: 'إجمالي الطلبات', value: String(stats.total), icon: Package },
            { label: 'طلبات جديدة', value: String(stats.newOrders ?? 0), icon: Clock3 },
            { label: 'تم التسليم', value: String(stats.delivered), icon: CheckCircle2 },
            { label: 'الإيرادات', value: formatPrice(stats.totalRevenue, currency), icon: Banknote },
          ].map((item) => (
            <div key={item.label} className="bg-card p-4">
              <div className="flex items-center gap-1.5 text-fg-subtle">
                <item.icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                <span className="text-[11px] font-medium">{item.label}</span>
              </div>
              <p className="mt-2 truncate font-display text-[1.35rem] font-semibold leading-none text-foreground" data-numeric>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* البحث والتحديث */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <label htmlFor="orders-search" className="sr-only">البحث في الطلبات</label>
          <Input
            id="orders-search"
            type="search"
            placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="ps-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="تحديث الطلبات"
          onClick={() => void fetchOrders(true)}
        >
          <RefreshCw className="size-4" aria-hidden />
        </Button>
      </div>

      {/* الفلاتر */}
      <div className="flex flex-wrap gap-0 border-b border-border" role="group" aria-label="تصفية الطلبات حسب الحالة">
        {FILTERS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={cn(
                'relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-label transition-colors',
                active
                  ? 'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent'
                  : 'font-medium text-fg-muted hover:text-foreground',
              )}
            >
              {key === 'all' ? 'الكل' : ORDER_STATUSES[key].label}
              <span className="text-[11px] text-fg-subtle" data-numeric>
                {statusCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد طلبات مطابقة'}
          description={
            orders.length === 0
              ? 'ستظهر الطلبات هنا مباشرة عندما يشتري العملاء من متجرك.'
              : 'جرّب تغيير الحالة أو مسح كلمة البحث.'
          }
          action={
            orders.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
              >
                مسح التصفية
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex gap-4 lg:h-[calc(100vh-330px)] lg:min-h-[520px]">
          {/* القائمة */}
          <div className={cn('flex flex-1 flex-col overflow-y-auto rounded-md border border-border bg-card lg:max-w-[380px] lg:min-w-[320px]', showMobileDetail && 'hidden lg:flex')}>
            {filteredOrders.map((order) => {
              const status = getUIStatus(order.status);
              const isSelected = activeOrder?.id === order.id;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => selectOrder(order)}
                  className={cn(
                    'relative w-full border-b border-border p-3 text-start transition-colors last:border-b-0',
                    isSelected ? 'bg-surface-sunken' : 'bg-card hover:bg-muted/60',
                  )}
                >
                  {isSelected ? (
                    <span aria-hidden className="absolute inset-y-3 start-0 w-0.5 bg-accent" />
                  ) : null}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-label font-semibold text-foreground" data-numeric>#{order.orderNumber}</span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-fg-muted" data-numeric>{formatShortDate(order.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-label font-semibold text-foreground" data-numeric>
                      {formatPrice(order.total, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                    <User className="size-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="truncate">{order.customerName}</span>
                    <span aria-hidden>·</span>
                    <span data-numeric>{order.itemsCount} منتج</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* التفاصيل */}
          <div className={cn('flex flex-1 flex-col overflow-hidden rounded-md border border-border bg-card', !showMobileDetail && 'hidden lg:flex')}>
            {activeOrder ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label="العودة إلى قائمة الطلبات"
                      className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-muted hover:text-foreground lg:hidden"
                      onClick={() => setShowMobileDetail(false)}
                    >
                      <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate text-body font-semibold text-foreground" data-numeric>
                        طلب #{activeOrder.orderNumber}
                      </h3>
                      <p className="text-[11px] text-fg-muted" data-numeric>{formatDate(activeOrder.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="مراسلة العميل على واتساب"
                      onClick={() => openWhatsApp(activeOrder.customerPhone, activeOrder.orderNumber)}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="حذف الطلب"
                      className="text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => handleDeleteOrder(activeOrder)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                  <section className="border-b border-border pb-5">
                    <h4 className="mb-3 flex items-center gap-1.5 text-label font-semibold text-foreground">
                      <User className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      بيانات العميل
                    </h4>
                    <dl className="grid grid-cols-2 gap-2 text-label">
                      <div>
                        <dt className="text-[11px] text-fg-muted">الاسم</dt>
                        <dd className="font-medium text-foreground">{activeOrder.customerName}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-fg-muted">الهاتف</dt>
                        <dd>
                          <button
                            type="button"
                            dir="ltr"
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                            onClick={() => openWhatsApp(activeOrder.customerPhone, activeOrder.orderNumber)}
                          >
                            {activeOrder.customerPhone}
                          </button>
                        </dd>
                      </div>
                      {activeOrder.customerAddress ? (
                        <div className="col-span-2">
                          <dt className="flex items-center gap-1 text-[11px] text-fg-muted"><MapPin className="size-3" aria-hidden />العنوان</dt>
                          <dd className="font-medium text-foreground">{activeOrder.customerAddress}</dd>
                        </div>
                      ) : null}
                      {activeOrder.customerNotes ? (
                        <div className="col-span-2">
                          <dt className="flex items-center gap-1 text-[11px] text-fg-muted"><FileText className="size-3" aria-hidden />ملاحظات</dt>
                          <dd className="mt-1 border-s-2 border-border ps-2 text-foreground">{activeOrder.customerNotes}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>

                  <section className="border-b border-border pb-5">
                    <h4 className="mb-3 flex items-center gap-1.5 text-label font-semibold text-foreground">
                      <Package className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      المنتجات
                      <span className="text-[11px] font-normal text-fg-muted" data-numeric>({activeOrder.itemsCount})</span>
                    </h4>
                    <ul className="divide-y divide-border border-y border-border">
                      {activeOrder.items.map((item, index) => (
                        <li key={index} className="flex items-center gap-2.5 py-2.5">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-sunken">
                            {item.image ? (
                              <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="size-full object-cover" />
                            ) : (
                              <Package className="size-4 text-fg-subtle" aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-label font-medium text-foreground">{item.name}</p>
                            <div className="flex gap-2 text-[11px] text-fg-muted">
                              {item.selectedColor ? <span>اللون: {item.selectedColor}</span> : null}
                              {item.selectedSize ? <span>المقاس: {item.selectedSize}</span> : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-end">
                            <span className="block text-[11px] text-fg-muted" data-numeric>×{item.quantity}</span>
                            <span className="block text-label font-semibold text-foreground" data-numeric>
                              {formatPrice(item.price, currency)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-label text-fg-muted">المجموع</span>
                      <strong className="text-body font-semibold text-foreground" data-numeric>{formatPrice(activeOrder.total, currency)}</strong>
                    </div>
                  </section>

                  <section className="border-b border-border pb-5">
                    <h4 className="mb-3 flex items-center gap-1.5 text-label font-semibold text-foreground">
                      <CreditCard className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      الدفع
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-label">
                      <div>
                        <span className="block text-[11px] text-fg-muted">طريقة الدفع</span>
                        <span className="font-medium text-foreground">
                          {activeOrder.paymentLabel ?? activeOrder.paymentProviderId ?? activeOrder.paymentMethod ?? 'غير محدد'}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 block text-[11px] text-fg-muted">حالة الدفع</span>
                        <Select
                          value={activeOrder.paymentStatus ?? 'pending'}
                          onValueChange={(value) => void handleUpdatePaymentStatus(activeOrder.id, value as Order['paymentStatus'])}
                          disabled={updating === activeOrder.id}
                        >
                          <SelectTrigger className="h-11 text-label">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">في الانتظار</SelectItem>
                            <SelectItem value="paid">مدفوع</SelectItem>
                            <SelectItem value="failed">فشل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {activeOrder.receiptImage ? (
                      <button
                        type="button"
                        onClick={() => setReceiptUrl(activeOrder.receiptImage ?? null)}
                        className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-md border border-border px-3 text-label font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <ImageIcon className="size-4" strokeWidth={1.75} aria-hidden />
                        عرض إيصال الدفع
                      </button>
                    ) : null}
                  </section>

                  <section className="border-b border-border pb-5">
                    <h4 className="mb-3 flex items-center gap-1.5 text-label font-semibold text-foreground">
                      <Clock3 className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      حالة الطلب
                    </h4>
                    <p className="mb-3 text-[12px] text-fg-muted">
                      {ORDER_STATUSES[getUIStatus(activeOrder.status)].description}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                      {(Object.entries(ORDER_STATUSES) as [OrderStatusKey, StatusInfo][]).map(([key, info]) => {
                        const Icon = info.icon;
                        const isActive = getUIStatus(activeOrder.status) === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={updating === activeOrder.id}
                            aria-pressed={isActive}
                            onClick={() => void handleUpdateStatus(activeOrder.id, key)}
                            className={cn(
                              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors',
                              isActive
                                ? 'border-accent bg-accent/5 text-foreground'
                                : 'border-border bg-card text-fg-muted hover:border-border-strong hover:text-foreground',
                              'disabled:cursor-not-allowed disabled:opacity-50',
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                            <span>{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 flex items-center gap-1.5 text-label font-semibold text-foreground">
                      <Calendar className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      سجل الطلب
                    </h4>
                    <ol className="relative space-y-3 ps-4 before:absolute before:inset-y-1 before:start-[5px] before:w-px before:bg-border">
                      {[
                        { label: 'تم الإنشاء', date: activeOrder.createdAt },
                        { label: 'تم التأكيد', date: activeOrder.confirmedAt },
                        { label: 'تم الشحن', date: activeOrder.shippedAt },
                        { label: 'تم التسليم', date: activeOrder.deliveredAt },
                      ]
                        .filter((entry) => Boolean(entry.date))
                        .map((entry) => (
                          <li key={entry.label} className="relative">
                            <span aria-hidden className="absolute -start-4 top-1.5 size-2 rounded-full bg-accent" />
                            <p className="text-[11px] font-medium text-foreground">{entry.label}</p>
                            <p className="text-[11px] text-fg-muted" data-numeric>{formatDate(entry.date)}</p>
                          </li>
                        ))}
                    </ol>
                  </section>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Package className="mb-2 size-10 text-fg-subtle" strokeWidth={1.5} aria-hidden />
                <p className="text-label text-fg-muted">اختر طلباً لعرض تفاصيله</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* إيصال الدفع */}
      <Dialog open={receiptUrl !== null} onOpenChange={(open) => (!open ? setReceiptUrl(null) : undefined)}>
        <DialogContent size="lg" title="إيصال الدفع">
          <div className="flex flex-col items-center gap-4 p-5">
            {receiptUrl ? (
              <img src={receiptUrl} alt="إيصال الدفع" className="max-h-[65dvh] w-auto max-w-full rounded-md border border-border object-contain" />
            ) : null}
            {receiptUrl ? (
              <a
                href={receiptUrl}
                download="receipt.png"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-label font-medium text-primary-foreground hover:bg-primary-light"
              >
                <Download className="size-4" strokeWidth={1.75} aria-hidden />
                تحميل الإيصال
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default OrdersManager;
