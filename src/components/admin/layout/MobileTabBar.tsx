/**
 * MobileTabBar — شريط التنقّل السفلي للجوال (`lg:hidden`).
 *
 * لماذا مكوّن مستقل: سابقاً كان الشريط الجانبي نفسه يتحوّل إلى شريط سفلي عبر
 * `max-lg:` داخل `Sidebar.tsx`، فاختلطت مسؤوليتان في ملف واحد وكان من الصعب
 * ضبط الحشو الآمن وأهداف اللمس دون التأثير على الديسكتوب.
 *
 * ضوابط الجوال:
 *   - كل هدف لمس 44×44 على الأقل (هنا 60px ارتفاعاً).
 *   - `pb-safe` يحترم `env(safe-area-inset-bottom)` في iPhone.
 *   - المحتوى في `AdminShell` يحصل على `pb-24` حتى لا يختفي آخر عنصر خلف الشريط.
 *   - `aria-current="page"` يأتي من NavLink تلقائياً.
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { cn } from '../../../lib/utils';
import { getMenuItems, tabRoute } from './menu';

function MobileTabBar(): React.JSX.Element {
  const { currentPlan } = useAuth();
  const { pendingOrdersCount } = useDashboard();

  const menuItems = getMenuItems(currentPlan?.id === 'annual');

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-[90] flex border-t border-border bg-background',
        'pb-safe lg:hidden',
      )}
      aria-label="تنقل لوحة التحكم"
    >
      {menuItems.map((item) => (
        <NavLink
          key={item.id}
          to={tabRoute(item.id)}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1',
              'text-[11px] font-semibold leading-none transition-colors',
              isActive ? 'text-foreground' : 'text-fg-muted hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-3 top-0 h-0.5 bg-accent"
                />
              ) : null}
              <span className="relative flex items-center justify-center" aria-hidden>
                <item.icon size={21} strokeWidth={1.75} className="shrink-0" />
                {item.id === 'orders' && pendingOrdersCount > 0 ? (
                  <span className="absolute -end-2 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded bg-danger px-1 text-[10px] font-semibold text-danger-foreground" data-numeric>
                    {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                  </span>
                ) : null}
              </span>
              <span>{item.shortLabel}</span>
              {item.id === 'orders' && pendingOrdersCount > 0 ? (
                <span className="sr-only">({pendingOrdersCount} طلبات جديدة)</span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileTabBar;