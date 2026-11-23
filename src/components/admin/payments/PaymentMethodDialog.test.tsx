// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethodDialog } from './PaymentMethodDialog';
import type { PaymentMethod } from '../../../schemas/payment';

vi.mock('../../../services/api', () => ({ api: { payments: { create: vi.fn().mockResolvedValue({ success: true, id: 'new' }), update: vi.fn().mockResolvedValue({ success: true }) } } }));
import { api } from '../../../services/api';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const editing: PaymentMethod = { id: 'one', providerId: 'onecash', countryCode: 'YE', configDetails: { phone: '777123456', accountName: 'محمد' } };

describe('PaymentMethodDialog editing sessions', () => {
  it('preserves selected country/provider and draft across parent callbacks rerender, resets only after reopen', () => {
    const view = render(<PaymentMethodDialog open editingMethod={null} onClose={() => {}} onSaved={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'السعودية' }));
    view.rerender(<PaymentMethodDialog open editingMethod={null} onClose={() => {}} onSaved={async () => {}} />);
    expect(screen.getByText('السعودية')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /STC Pay/ }));
    fireEvent.change(screen.getByLabelText('تسمية مخصصة (اختياري)'), { target: { value: 'حساب تجريبي' } });
    fireEvent.change(screen.getByLabelText(/رقم الجوال/), { target: { value: '0512345678' } });
    view.rerender(<PaymentMethodDialog open editingMethod={null} onClose={() => {}} onSaved={async () => {}} />);
    expect((screen.getByLabelText('تسمية مخصصة (اختياري)') as HTMLInputElement).value).toBe('حساب تجريبي');
    expect((screen.getByLabelText(/رقم الجوال/) as HTMLInputElement).value).toBe('0512345678');
    view.rerender(<PaymentMethodDialog open={false} editingMethod={null} onClose={() => {}} onSaved={async () => {}} />);
    view.rerender(<PaymentMethodDialog open editingMethod={null} onClose={() => {}} onSaved={async () => {}} />);
    expect(screen.getByRole('button', { name: 'اليمن' })).toBeTruthy();
    expect(screen.queryByLabelText(/رقم الجوال/)).toBeNull();
  });
  it('preserves edited fields when polling replaces method object, initializes when identity changes', () => {
    const view = render(<PaymentMethodDialog open editingMethod={editing} onClose={() => {}} onSaved={async () => {}} />);
    fireEvent.change(screen.getByLabelText(/رقم المحفظة/), { target: { value: '777987654' } });
    view.rerender(<PaymentMethodDialog open editingMethod={{ ...editing, configDetails: { ...editing.configDetails } }} onClose={() => {}} onSaved={async () => {}} />);
    expect((screen.getByLabelText(/رقم المحفظة/) as HTMLInputElement).value).toBe('777987654');
    view.rerender(<PaymentMethodDialog open editingMethod={{ ...editing, id: 'two', configDetails: { phone: '711111111', accountName: 'أحمد' } }} onClose={() => {}} onSaved={async () => {}} />);
    expect((screen.getByLabelText(/رقم المحفظة/) as HTMLInputElement).value).toBe('711111111');
  });
  it('cleans provider receipt draft, COD cannot request receipt, duplicate save is locked', async () => {
    const onClose = vi.fn();
    render(<PaymentMethodDialog open editingMethod={null} onClose={onClose} onSaved={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'السعودية' }));
    fireEvent.click(screen.getByRole('button', { name: /STC Pay/ }));
    fireEvent.click(screen.getByRole('switch', { name: 'طلب إيصال الدفع' }));
    fireEvent.change(screen.getByLabelText('تعليمات للعميل (اختياري)'), { target: { value: 'تعليمات قديمة' } });
    fireEvent.click(screen.getByRole('button', { name: 'تغيير' }));
    fireEvent.click(screen.getByRole('button', { name: /الدفع عند الاستلام/ }));
    expect(screen.queryByRole('switch', { name: 'طلب إيصال الدفع' })).toBeNull();
    const save = screen.getByRole('button', { name: 'إضافة طريقة الدفع' });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(api.payments.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.payments.create).mock.calls[0]?.[0]).toMatchObject({ countryCode: 'SA', requireReceipt: false, receiptInstructions: '', configDetails: {} });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
