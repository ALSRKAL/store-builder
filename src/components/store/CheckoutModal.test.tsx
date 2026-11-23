// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutModal from './CheckoutModal';
import type { PaymentMethod } from '../../schemas/payment';

const payment = vi.hoisted(() => ({ methods: [] as PaymentMethod[], loading: false }));
vi.mock('../../contexts/PaymentContext', () => ({ usePayment: () => ({ paymentMethods: payment.methods, loading: payment.loading, isAnnualPlan: true }) }));
vi.mock('../../contexts/StoreContext', () => ({ useStore: () => ({ store: { slug: 'test-store' }, products: [], formatPrice: (value: number) => `${value} ريال` }) }));
vi.mock('../../services/api', () => ({ api: { publicOrders: { create: vi.fn().mockResolvedValue({ success: true, orderNumber: 'TEST', orderId: 'test' }) } } }));
const method: PaymentMethod = { id: 'cash', providerId: 'cod', label: 'دفع تجريبي', requireReceipt: true };
const items = [{ id: 'item', name: 'منتج', price: 20, quantity: 1 }];
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); payment.loading = false; });

describe('CheckoutModal session and payment refresh', () => {
  it('retains chosen payment across parent rerender and reopens after animated close while mounted', async () => {
    payment.methods = [method];
    const onClose = vi.fn();
    const view = render(<CheckoutModal isOpen onClose={onClose} items={items} total={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'دفع تجريبي' }));
    payment.methods = [{ ...method }];
    view.rerender(<CheckoutModal isOpen onClose={onClose} items={items} total={20} />);
    expect(screen.getByRole('button', { name: 'دفع تجريبي' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    view.rerender(<CheckoutModal isOpen={false} onClose={onClose} items={items} total={20} />);
    view.rerender(<CheckoutModal isOpen onClose={onClose} items={items} total={20} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'دفع تجريبي' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps customer and step on refresh, clears disappeared method with explicit review feedback', () => {
    payment.methods = [method];
    const view = render(<CheckoutModal isOpen onClose={() => {}} items={items} total={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'دفع تجريبي' }));
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    fireEvent.change(screen.getByLabelText(/الاسم الكامل/), { target: { value: 'عميل تجريبي' } });
    payment.loading = true;
    payment.methods = [];
    view.rerender(<CheckoutModal isOpen onClose={() => {}} items={items} total={20} />);
    expect((screen.getByLabelText(/الاسم الكامل/) as HTMLInputElement).value).toBe('عميل تجريبي');
    payment.loading = false;
    payment.methods = [{ ...method }];
    view.rerender(<CheckoutModal isOpen onClose={() => {}} items={items} total={20} />);
    expect((screen.getByLabelText(/الاسم الكامل/) as HTMLInputElement).value).toBe('عميل تجريبي');
    // COD remains a two-step flow despite bad legacy requireReceipt=true.
    expect(screen.getByRole('button', { name: 'إرسال الطلب' })).toBeTruthy();
    payment.methods = [];
    view.rerender(<CheckoutModal isOpen onClose={() => {}} items={items} total={20} />);
    expect((screen.getByLabelText(/الاسم الكامل/) as HTMLInputElement).value).toBe('عميل تجريبي');
    expect(screen.getByRole('alert').textContent).toContain('لم تعد متاحة');
    expect((screen.getByRole('button', { name: 'إرسال الطلب' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة طريقة الدفع' }));
    expect(screen.getByText('لا توجد طرق دفع مفعّلة')).toBeTruthy();
  });
});
