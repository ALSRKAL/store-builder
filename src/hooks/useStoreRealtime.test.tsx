// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { PaymentProvider, usePayment } from '../contexts/PaymentContext';
import { reconnectDelay } from './realtime/publicResource';

class FakeSocket {
  static sockets: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) { FakeSocket.sockets.push(this); }
  close() { this.readyState = 3; this.onclose?.(); }
  send(_value: string) { /* read-only ping */ }
  event(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }); }
}

function Probe() {
  const { store, products, notFound } = useStore();
  const { paymentMethods, isAnnualPlan } = usePayment();
  const [cartCount, setCartCount] = useState(0);
  return <>
    <div data-testid="store">{notFound ? 'deleted' : store?.name ?? 'loading'}</div>
    <div data-testid="product">{products[0]?.name ?? 'empty'}</div>
    <div data-testid="payment">{isAnnualPlan ? paymentMethods[0]?.label ?? 'loading' : 'disabled'}</div>
    <button onClick={() => setCartCount(count => count + 1)}>Cart {cartCount}</button>
  </>;
}

function setup(identifier: string) {
  vi.stubGlobal('WebSocket', FakeSocket);
  let versions = { store: 1, products: 1, categories: 1, payments: 1 };
  let revision = 1;
  let storeName = 'Store';
  let productName = 'Original product';
  let paymentLabel = 'Original payment';
  let annual = true;
  let deleted = false;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    expect(init?.cache).toBe('no-store');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const resource = url.endsWith('/products') ? 'products' : url.endsWith('/categories') ? 'categories'
      : url.endsWith('/payment-methods') ? 'payments' : 'store';
    const data = {
      store: { id: identifier, slug: identifier, name: storeName, isAnnualPlan: annual, isActive: true },
      products: [{ id: 'p1', storeId: identifier, name: productName, price: 10, images: [], inStock: true }],
      categories: [],
      payments: [{ id: 'pm1', providerId: 'cod', countryCode: 'SA', label: paymentLabel,
        requireReceipt: false, displayInfo: {} }],
    }[resource];
    return new Response(JSON.stringify(deleted ? { error: 'Store not found' } : data), {
      status: deleted ? 404 : 200,
      headers: { 'X-Store-Id': identifier, 'X-Resource-Revision': String(versions[resource]) },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><StoreProvider storeId={identifier}>
    <PaymentProvider><Probe /></PaymentProvider>
  </StoreProvider></QueryClientProvider>);
  const snapshot = () => ({ type: 'snapshot', storeId: identifier, slug: identifier, revision, versions,
    deleted, isActive: !deleted, isAnnualPlan: annual, subscriptionEnd: '2099-01-01' });
  return {
    view, client, fetchMock, snapshot,
    update(resource: keyof typeof versions) {
      versions = { ...versions, [resource]: versions[resource] + 1 }; revision++;
      if (resource === 'products') productName = 'Updated product';
      if (resource === 'payments') paymentLabel = 'Updated payment';
      if (resource === 'store') storeName = 'Updated store';
    },
    downgrade() { annual = false; versions = { ...versions, store: versions.store + 1, payments: versions.payments + 1 }; revision++; },
    remove() { deleted = true; revision++; versions = { store: 99, products: 99, categories: 99, payments: 99 }; },
  };
}

afterEach(() => { cleanup(); FakeSocket.sockets = []; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('storefront realtime resource updates', () => {
  it('coalesces duplicate product events, keeps cart state, shares payment queries, and confirms deletion', async () => {
    const fixture = setup('react-shop');
    await waitFor(() => expect(screen.getByTestId('payment')).toHaveTextContent('Original payment'));
    expect(FakeSocket.sockets).toHaveLength(1);
    const socket = FakeSocket.sockets[0];
    act(() => socket.event(fixture.snapshot()));
    await new Promise(resolve => setTimeout(resolve, 120));
    fixture.fetchMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Cart 0' }));
    fixture.update('products');
    act(() => { socket.event(fixture.snapshot()); socket.event(fixture.snapshot()); socket.event(fixture.snapshot()); });
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent('Updated product'));
    expect(screen.getByRole('button', { name: 'Cart 1' })).toBeInTheDocument();
    expect(fixture.fetchMock.mock.calls.map(call => call[0])).toEqual([expect.stringContaining('/products')]);

    fixture.fetchMock.mockClear();
    fixture.update('payments');
    act(() => socket.event(fixture.snapshot()));
    await waitFor(() => expect(screen.getByTestId('payment')).toHaveTextContent('Updated payment'));
    expect(fixture.fetchMock.mock.calls.map(call => call[0])).toEqual([expect.stringContaining('/payment-methods')]);

    fixture.downgrade();
    act(() => socket.event(fixture.snapshot()));
    await waitFor(() => expect(screen.getByTestId('payment')).toHaveTextContent('disabled'));
    fixture.remove();
    act(() => socket.event(fixture.snapshot()));
    expect(screen.getByTestId('store')).toHaveTextContent('deleted');
    expect(screen.getByRole('button', { name: 'Cart 1' })).toBeInTheDocument();
    fixture.client.clear();
  });

  it('releases hidden sockets and reconnects with snapshot gap reconciliation without client polling', async () => {
    const fixture = setup('visibility-shop');
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent('Original product'));
    const socket = FakeSocket.sockets[0];
    act(() => socket.event(fixture.snapshot()));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(socket.readyState).toBe(3);
    fixture.update('products');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(FakeSocket.sockets).toHaveLength(2);
    act(() => FakeSocket.sockets[1].event(fixture.snapshot()));
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent('Updated product'));
    fixture.client.clear();
  });

  it('uses capped exponential backoff with jitter', () => {
    expect(reconnectDelay(0, 0)).toBe(750);
    expect(reconnectDelay(1, 0.5)).toBe(2000);
    expect(reconnectDelay(30, 1)).toBe(37_500);
  });
});
