// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnouncementSettings, { type AnnouncementData } from './AnnouncementSettings';

const announcement: AnnouncementData = {
  enabled: true, message: 'الإعلان المحفوظ', backgroundColor: '#191710', textColor: '#fcfaf3',
  icon: 'megaphone', isScrolling: false, canClose: true, link: '', linkText: '',
};

describe('AnnouncementSettings', () => {
  it('preserves a draft when the parent refreshes an unchanged announcement', async () => {
    const onSave = vi.fn();
    const { rerender } = render(<AnnouncementSettings announcement={announcement} onSave={onSave} />);
    await userEvent.clear(screen.getByLabelText('نص الإعلان'));
    await userEvent.type(screen.getByLabelText('نص الإعلان'), 'إعلان جديد');
    rerender(<AnnouncementSettings announcement={{ ...announcement }} onSave={onSave} />);
    expect(screen.getByLabelText('نص الإعلان')).toHaveValue('إعلان جديد');
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeEnabled();
  });

  it('previews and saves the scrolling preference with the same store component', async () => {
    const onSave = vi.fn();
    render(<AnnouncementSettings announcement={announcement} onSave={onSave} />);
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /متحرك/ }));
    expect(screen.getByRole('region', { name: 'معاينة إعلان المتجر' })).toHaveAttribute('data-scrolling', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(onSave).toHaveBeenCalledWith({ ...announcement, isScrolling: true });
  });
});
