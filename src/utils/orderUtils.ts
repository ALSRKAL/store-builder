/**
 * جلب كل طلبات المتجر مع احترام pagination الخادم.
 *
 * `getAllLegacy` يطلب limit=1000 لكن الخادم يقصّه إلى 100، فكانت الطلبات
 * الأقدم تختفي من اللوحة. نجمع الصفحات هنا بدل تعديل عقد الـAPI.
 */

import { api } from '../services/api';
import type { Order } from '../schemas/order';

const PAGE_SIZE = 100;
/** سقف أمان حتى لا يدخل عميل بآلاف الطلبات في حلقة لا تنتهي. */
const MAX_PAGES = 50;

export async function fetchAllOrders(): Promise<Order[]> {
  const firstPage = await api.orders.getAll({ page: 1, limit: PAGE_SIZE });
  const totalPages = Math.min(firstPage.pagination.totalPages || 1, MAX_PAGES);
  if (totalPages <= 1) return firstPage.data;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.orders.getAll({ page: index + 2, limit: PAGE_SIZE }),
    ),
  );

  return remaining.reduce<Order[]>(
    (all, page) => all.concat(page.data),
    firstPage.data,
  );
}
