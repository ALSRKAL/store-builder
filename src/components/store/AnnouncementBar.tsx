/**
 * AnnouncementBar — one-line merchant announcement.
 * No marquee, no gradient, no motion: text wraps or truncates, and the close
 * control is a 44px square.
 */

import { useState } from 'react';
import { Clock, Gift, Megaphone, Percent, Sparkles, Tag, Truck, X, type LucideIcon } from 'lucide-react';

type IconName = 'megaphone' | 'sparkles' | 'tag' | 'truck' | 'clock' | 'gift' | 'percent';

const ICONS: Record<IconName, LucideIcon> = {
  megaphone: Megaphone,
  sparkles: Sparkles,
  tag: Tag,
  truck: Truck,
  clock: Clock,
  gift: Gift,
  percent: Percent,
};

export interface AnnouncementData {
  enabled?: boolean;
  message?: string;
  /** اسم قديم للحقل نفسه، للتوافق مع بيانات محفوظة سابقاً. */
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: IconName;
  isScrolling?: boolean;
  canClose?: boolean;
  link?: string;
  linkText?: string;
}

interface AnnouncementBarProps {
  announcement?: AnnouncementData | unknown;
}

export default function AnnouncementBar({ announcement }: AnnouncementBarProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(true);

  const data = announcement as AnnouncementData | undefined;
  const {
    enabled = false,
    message = '',
    text = '',
    backgroundColor = '#191710',
    textColor = '#fcfaf3',
    icon = 'megaphone',
    canClose = true,
    link = '',
    linkText = '',
  } = data ?? {};

  const content = (message || text).trim();
  if (!enabled || !content || !visible) return null;

  const Icon = ICONS[icon] ?? Megaphone;
  const linkHref = /^https?:\/\//i.test(link) ? link : `https://${link.replace(/^\/+/, '')}`;

  return (
    <div
      role="region"
      aria-label="إعلان المتجر"
      className="relative z-[60] w-full"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="relative mx-auto flex h-11 max-w-[1200px] items-center justify-center gap-2 px-12 text-center text-[12px] font-medium">
        <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 truncate">
          {content}
          {link && linkText ? (
            <a
              href={linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-2 underline decoration-current/40 underline-offset-4 hover:decoration-current"
            >
              {linkText}
            </a>
          ) : null}
        </span>

        {canClose ? (
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="إغلاق الشريط الإعلاني"
            className="absolute end-0 top-0 inline-flex size-11 items-center justify-center text-inherit opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
