import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('../config/firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('local-test-token') } },
}));
import { api } from './api';

function response(data: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe('payment and checkout API response contracts', () => {
  it('reads the created payment ID from the success envelope', async () => {
    response({ success: true, id: 'method-1', message: 'saved' });
    const result = await api.payments.create({ countryCode: 'SA', providerId: 'cod', configDetails: {} });
    expect(result).toEqual({ success: true, id: 'method-1', message: 'saved' });
  });

  it('uses the actual update and toggle envelopes', async () => {
    response({ success: true, message: 'saved' });
    expect(await api.payments.update('method-1', { label: 'عند الاستلام' })).toEqual({ success: true, message: 'saved' });
    response({ success: true, isActive: false });
    expect(await api.payments.toggle('method-1')).toEqual({ success: true, isActive: false });
  });

  it('uses the receipt success envelope rather than inventing a receipt object', async () => {
    response({ success: true, id: 'receipt-1' });
    expect(await api.publicPayments.submitReceipt('shop', {
      paymentMethodId: 'method-1', receiptImage: 'data:image/png;base64,AA==',
    })).toEqual({ success: true, id: 'receipt-1' });
    response({ success: true });
    expect(await api.payments.updateReceiptStatus('receipt-1', 'approved')).toEqual({ success: true });
  });

  it('keeps the order ID, number and WhatsApp link returned by the server', async () => {
    const result = { success: true, orderId: 'order-1', orderNumber: 'ORD-0001', whatsappLink: null };
    response(result);
    expect(await api.publicOrders.create('shop', {
      customerName: 'عميل الاختبار', customerPhone: '0500000000', customerAddress: 'عنوان الاختبار',
      paymentMethodId: 'method-1', items: [{ id: 'product-1', name: 'منتج الاختبار', price: 10, quantity: 1 }],
    })).toEqual(result);
  });
});
