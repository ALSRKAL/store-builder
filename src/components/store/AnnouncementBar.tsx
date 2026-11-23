/**
 * AnnouncementBar — إعلان ثابت أو شريط أخبار باختيار صاحب المتجر.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Clock, Gift, Megaphone, Percent, Sparkles, Tag, Truck, X, type LucideIcon } from 'lucide-react';
import '../../styles/announcement.css';

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
  icon?: IconName | string;
  isScrolling?: boolean;
  canClose?: boolean;
  link?: string;
  linkText?: string;
}

interface AnnouncementBarProps {
  announcement?: AnnouncementData | unknown;
  preview?: boolean;
}

function announcementLink(link: string): string | null {
  if (!link.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function tickerMotion(viewportWidth: number, textWidth: number): { start: number; end: number; duration: number } {
  const start = viewportWidth + 2;
  const end = -textWidth - 2;
  return { start, end, duration: (start - end) / 55 };
}

function AnnouncementTicker({ children }: { children: ReactNode }): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    let disposed = false;
    let frame = 0;
    let previous = '';
    const measure = (): void => {
      frame = 0;
      if (disposed) return;
      const viewportWidth = viewport.clientWidth;
      const textWidth = track.scrollWidth;
      if (!viewportWidth || !textWidth) return;
      const dimensions = `${viewportWidth}:${textWidth}`;
      if (dimensions === previous) return;
      previous = dimensions;
      const motion = tickerMotion(viewportWidth, textWidth);
      track.style.setProperty('--announcement-start', `${motion.start}px`);
      track.style.setProperty('--announcement-end', `${motion.end}px`);
      track.style.setProperty('--announcement-duration', `${motion.duration}s`);
      track.dataset.ready = 'true';
    };
    const schedule = (): void => {
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(track);
    measure();
    void document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={viewportRef} className="announcement-viewport" dir="ltr" tabIndex={0} aria-label="شريط أخبار المتجر؛ يتوقف عند التركيز">
      <div ref={trackRef} className="announcement-track" dir="auto">{children}</div>
    </div>
  );
}

export default function AnnouncementBar({ announcement, preview = false }: AnnouncementBarProps): React.JSX.Element | null {
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>(null);
  const data = announcement as AnnouncementData | undefined;
  const {
    enabled = false,
    message = '',
    text = '',
    backgroundColor = '#191710',
    textColor = '#fcfaf3',
    icon = 'megaphone',
    isScrolling = false,
    canClose = true,
    link = '',
    linkText = '',
  } = data ?? {};

  const content = (message || text).trim();
  const identity = JSON.stringify([enabled, content, backgroundColor, textColor, icon, isScrolling, canClose, link, linkText]);
  if ((!enabled && !preview) || !content || (!preview && dismissedAnnouncement === identity)) return null;

  const Icon = ICONS[icon as IconName] ?? Megaphone;
  const linkHref = announcementLink(link);
  const showClose = canClose && !preview;
  const contentWithLink = (
    <>
      <bdi>{content}</bdi>
      {linkHref && linkText ? (
        preview ? (
          <span className="ms-3 underline underline-offset-4">{linkText}</span>
        ) : (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-3 rounded-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {linkText}
          </a>
        )
      ) : null}
    </>
  );

  return (
    <div
      role="region"
      aria-label={preview ? 'معاينة إعلان المتجر' : 'إعلان المتجر'}
      className="announcement-bar relative w-full"
      data-scrolling={isScrolling}
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`announcement-layout ${isScrolling ? 'announcement-layout-moving' : 'announcement-layout-static'} ${showClose ? 'announcement-has-close' : ''}`}>
        <span className="announcement-icon"><Icon className="size-4" strokeWidth={1.75} aria-hidden /></span>
        {isScrolling ? (
          <AnnouncementTicker key={identity}>{contentWithLink}</AnnouncementTicker>
        ) : (
          <span className="announcement-static" dir="auto">{contentWithLink}</span>
        )}
        {showClose ? (
          <button
            type="button"
            onClick={() => setDismissedAnnouncement(identity)}
            aria-label="إغلاق الشريط الإعلاني"
            className="absolute end-0 top-0 inline-flex size-11 items-center justify-center text-inherit transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
