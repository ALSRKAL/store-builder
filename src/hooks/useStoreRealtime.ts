import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import {
  parseRevision, realtimeUrl, reconnectDelay, rememberSnapshot, resourcesBehind,
  type Resource, type RevisionSnapshot,
} from './realtime/publicResource';

/** One read-only socket per StoreProvider, never one per resource/payment consumer.
 * Hidden/offline pages release it; reconnect's authoritative snapshot repairs gaps.
 */
export function useStoreRealtime(identifier: string | undefined): RevisionSnapshot | null {
  const client = useQueryClient();
  const [received, setReceived] = useState<{ identifier: string; snapshot: RevisionSnapshot } | null>(null);

  useEffect(() => {
    if (!identifier || typeof WebSocket === 'undefined') return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let connectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let lastMessage = Date.now();
    let latest: RevisionSnapshot | null = null;
    const pending = new Set<Resource>();
    const aliases = new Set([identifier]);
    const visible = () => document.visibilityState !== 'hidden' && navigator.onLine;

    const invalidate = (resource: Resource, alias: string) => {
      const key = { store: queryKeys.store.bySlug, products: queryKeys.store.products,
        categories: queryKeys.store.categories, payments: queryKeys.store.paymentMethods }[resource](alias);
      // exact is essential: ['store', slug] otherwise invalidates every resource.
      void client.invalidateQueries({ queryKey: key, exact: true }, { cancelRefetch: false });
    };
    const flush = () => {
      flushTimer = undefined;
      if (disposed || !visible() || !latest) return;
      for (const resource of resourcesBehind(identifier, latest)) pending.add(resource);
      for (const resource of pending) for (const alias of aliases) invalidate(resource, alias);
      pending.clear();
    };
    const scheduleFlush = () => {
      if (!flushTimer) flushTimer = setTimeout(flush, 80);
    };
    const stop = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (connectTimer) clearTimeout(connectTimer);
      reconnectTimer = heartbeatTimer = connectTimer = undefined;
      const previous = socket;
      socket = null;
      if (previous) { previous.onclose = null; previous.onerror = null; previous.close(); }
    };
    const connect = () => {
      if (disposed || !visible() || socket) return;
      const ws = new WebSocket(realtimeUrl(identifier));
      socket = ws;
      connectTimer = setTimeout(() => ws.close(), 15_000);
      ws.onopen = () => {
        if (disposed || socket !== ws) return;
        if (connectTimer) clearTimeout(connectTimer);
        lastMessage = Date.now();
        heartbeatTimer = setInterval(() => {
          if (Date.now() - lastMessage > 70_000) { ws.close(); return; }
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 25_000);
      };
      ws.onmessage = event => {
        if (disposed || socket !== ws) return;
        lastMessage = Date.now();
        if (event.data === 'pong') return;
        let value: unknown;
        try { value = JSON.parse(String(event.data)); } catch { return; }
        const snapshot = parseRevision(value);
        if (!snapshot || !rememberSnapshot(identifier, snapshot)) return;
        attempts = 0; // Reset only after a valid snapshot, not a briefly-open connection.
        latest = snapshot;
        aliases.add(snapshot.storeId);
        aliases.add(snapshot.slug);
        rememberSnapshot(snapshot.storeId, snapshot);
        rememberSnapshot(snapshot.slug, snapshot);
        setReceived({ identifier, snapshot });
        for (const resource of resourcesBehind(identifier, snapshot)) pending.add(resource);
        scheduleFlush();
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (socket !== ws) return;
        socket = null;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (connectTimer) clearTimeout(connectTimer);
        heartbeatTimer = connectTimer = undefined;
        if (disposed || !visible()) return;
        reconnectTimer = setTimeout(() => { reconnectTimer = undefined; connect(); }, reconnectDelay(attempts++));
      };
    };
    const onVisibility = () => {
      if (!visible()) stop();
      else { attempts = 0; connect(); scheduleFlush(); }
    };
    // Mark-only query subscription repairs an event racing an already-running
    // fetch without periodic full polling. Failed fetches wait for reconnect/refetch.
    const unsubscribe = client.getQueryCache().subscribe(event => {
      if (event.type !== 'updated' || event.action.type !== 'success' || !latest) return;
      const key = event.query.queryKey;
      if (key[0] !== 'store' || !aliases.has(String(key[1]))) return;
      if (resourcesBehind(identifier, latest).length) scheduleFlush();
    });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onVisibility);
    window.addEventListener('offline', onVisibility);
    connect();
    return () => {
      disposed = true;
      stop();
      if (flushTimer) clearTimeout(flushTimer);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onVisibility);
      window.removeEventListener('offline', onVisibility);
    };
  }, [client, identifier]);

  return received && received.identifier === identifier ? received.snapshot : null;
}
