/**
 * AuthShell — one frame for Login, VerifyCode, Setup, Success and Blocked.
 *
 * Desktop: an ink panel carries the platform statement, the paper panel carries
 * the task. Mobile: wordmark strip then the form. No glow, no floating card,
 * no icon tile.
 */

import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import Wordmark from '../brand/Wordmark';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-[400px]',
  footer,
}: AuthShellProps): React.JSX.Element {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-[42%] shrink-0 flex-col justify-between border-e border-border bg-primary px-10 py-9 text-primary-foreground lg:flex xl:px-14">
        <Link to="/" className="inline-flex min-h-11 items-center" aria-label="StoreBuilder — الرئيسية">
          <Wordmark size="md" tone="paper" />
        </Link>

        <div className="max-w-[24rem]">
          <span aria-hidden className="mb-7 block h-0.5 w-12 bg-highlight" />
          <p className="font-display text-[1.9rem] font-semibold leading-[1.4] xl:text-[2.15rem]">
            دفتر طلباتك، مرتّباً كما يليق بمتجرك.
          </p>
          <p className="mt-4 text-body leading-relaxed text-primary-foreground/70">
            المنتجات والطلبات والمظهر ورابط المتجر في لوحة واحدة. تُدير البيع
            اليومي بدل أن تبحث عن أرقامك بين المحادثات.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-primary-foreground/15 pt-5 text-[12px] text-primary-foreground/60">
          <span>منصة عربية لإدارة المتاجر</span>
          <span dir="ltr">StoreBuilder</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-border px-5 lg:hidden">
          <Link to="/" className="inline-flex min-h-11 items-center" aria-label="StoreBuilder — الرئيسية">
            <Wordmark size="md" />
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className={cn('w-full', maxWidth)}>
            {icon ? (
              <span
                aria-hidden
                className="mb-6 inline-flex size-10 items-center justify-center border border-border text-accent [&_svg]:size-5 [&_svg]:stroke-[1.75]"
              >
                {icon}
              </span>
            ) : null}

            <h1 className="font-display text-h1 font-semibold leading-snug text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-body leading-relaxed text-fg-muted">{subtitle}</p>
            ) : null}

            <div className="mt-7">{children}</div>

            {footer ? (
              <div className="mt-7 border-t border-border pt-5 text-start">{footer}</div>
            ) : null}
          </div>
        </main>

        <p className="px-5 pb-6 text-start text-[12px] text-fg-subtle sm:px-8">
          بالمتابعة أنت توافق على{' '}
          <Link
            to="/terms"
            className="inline-flex min-h-11 items-center font-medium text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            الشروط والأحكام
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
