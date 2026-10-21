/**
 * Sidebar — desktop navigation for the merchant dashboard.
 *
 * Paper surface, 1px rule, text-first navigation: the active item is marked by
 * a saffron rule and a sunken background, not a filled pill.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { LogOut, Store } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Wordmark from '../../brand/Wordmark';
import { getMenuItems, tabRoute } from './menu';

function Sidebar(): React.JSX.Element {
  const { adminData, currentPlan } = useAuth();
  const { logout, pendingOrdersCount } = useDashboard();
  const navigate = useNavigate();

  const isAnnualPlan = currentPlan?.id === 'annual';
  const menuItems = getMenuItems(isAnnualPlan);
  const planLabel = isAnnualPlan ? 'الخطة السنوية' : currentPlan?.name ?? null;

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/admin');
  };

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col border-e border-border bg-surface lg:flex"
      aria-label="تنقل لوحة التحكم"
    >
      <div className="border-b border-border px-4 pb-4 pt-5">
        <Wordmark size="sm" />

        <div className="mt-4 flex items-center gap-3">
          {adminData?.logo ? (
            <img
              src={adminData.logo}
              alt=""
              className="size-9 shrink-0 rounded-md border border-border object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken text-fg-muted"
              aria-hidden
            >
              <Store size={17} strokeWidth={1.75} />
            </span>
          )}

          <div className="min-w-0">
            <p className="truncate text-label font-semibold text-foreground">
              {adminData?.storeName ?? 'المتجر'}
            </p>
            {planLabel ? (
              <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{planLabel}</p>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="أقسام لوحة التحكم">
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium text-fg-subtle">إدارة المتجر</p>

        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={tabRoute(item.id)}
            className={({ isActive }) =>
              cn(
                'relative flex h-11 items-center gap-3 rounded-md px-3 text-label font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-surface-sunken text-foreground'
                  : 'text-fg-muted hover:bg-muted hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span aria-hidden className="absolute inset-y-2.5 start-0 w-0.5 bg-accent" />
                ) : null}
                <item.icon
                  size={18}
                  strokeWidth={1.75}
                  className={cn('shrink-0', isActive ? 'text-foreground' : 'text-fg-subtle')}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.id === 'orders' && pendingOrdersCount > 0 ? (
                  <>
                    <span className="min-w-5 rounded bg-danger px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-danger-foreground" data-numeric>
                      {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                    </span>
                    <span className="sr-only">({pendingOrdersCount} طلبات جديدة)</span>
                  </>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-label font-medium text-fg-muted transition-colors hover:bg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden />
          <span>تسجيل الخروج</span>
        </button>
        <p className="px-3 pb-1 pt-2 text-[11px] text-fg-subtle">StoreBuilder — إدارة المتاجر</p>
      </div>
    </aside>
  );
}

export default Sidebar;
