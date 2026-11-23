// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnouncementBar, { tickerMotion } from './AnnouncementBar';

const announcement = { enabled: true, message: 'خصم على المنتجات الجديدة', canClose: true };

describe('AnnouncementBar', () => {
  it('renders static content completely without a duplicate', () => {
    render(<AnnouncementBar announcement={announcement} />);
    expect(screen.getByRole('region')).toHaveAttribute('data-scrolling', 'false');
    expect(screen.getByText(announcement.message)).toBeVisible();
    expect(document.querySelector('.announcement-duplicate')).toBeNull();
  });

  it('uses one scrolling text instead of resetting a duplicated short track mid-bar', () => {
    render(<AnnouncementBar announcement={{ ...announcement, isScrolling: true }} />);
    expect(screen.getByRole('region')).toHaveAttribute('data-scrolling', 'true');
    expect(document.querySelector('.announcement-track')).not.toBeNull();
    expect(screen.getAllByText(announcement.message)).toHaveLength(1);
  });

  it.each([[390, 90], [1440, 220], [390, 1800]])(
    'enters and exits fully outside viewport %s with text width %s at constant speed',
    (viewport, text) => {
      const { start, end, duration } = tickerMotion(viewport, text);
      expect(start).toBeGreaterThan(viewport);
      expect(end + text).toBeLessThan(0);
      expect((start - end) / duration).toBeCloseTo(55, 8);
    },
  );

  it('keeps a dismissed announcement closed on refetch but displays new content', async () => {
    const { rerender } = render(<AnnouncementBar announcement={announcement} />);
    await userEvent.click(screen.getByRole('button', { name: 'إغلاق الشريط الإعلاني' }));
    expect(screen.queryByRole('region')).toBeNull();
    rerender(<AnnouncementBar announcement={{ ...announcement }} />);
    expect(screen.queryByRole('region')).toBeNull();
    rerender(<AnnouncementBar announcement={{ ...announcement, message: 'الإعلان الجديد' }} />);
    expect(screen.getByText('الإعلان الجديد')).toBeVisible();
  });

  it('makes the preview noninteractive and keeps only one keyboard-accessible link', () => {
    const data = { ...announcement, isScrolling: true, link: 'https://example.com', linkText: 'العروض' };
    const { rerender } = render(<AnnouncementBar announcement={data} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    rerender(<AnnouncementBar announcement={data} preview />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not issue network requests while animating', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<AnnouncementBar announcement={{ ...announcement, isScrolling: true }} />);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
