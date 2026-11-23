import type { Env } from '../types';
import { changedResources, type StoreRevision } from './protocol';
import { primaryEnv, readStoreRevision, revisionSnapshot } from './revisions';

const RECONCILE_MS = 30_000;
const MAX_SOCKETS = 500;

/** One object per immutable store ID. No timers/closures held for each socket. */
export class StoreRealtime implements DurableObject {
  private storeId: string | null = null;
  private snapshot: StoreRevision | null = null;

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    state.blockConcurrencyWhile(async () => {
      this.storeId = await state.storage.get<string>('storeId') ?? null;
      this.snapshot = await state.storage.get<StoreRevision>('snapshot') ?? null;
    });
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const storeId = request.headers.get('X-Store-Id');
    if (!storeId || (this.storeId && this.storeId !== storeId)) return new Response('Invalid store', { status: 400 });
    if (!this.storeId) {
      this.storeId = storeId;
      await this.state.storage.put('storeId', storeId);
    }
    // This endpoint is accessible only via the private namespace. Worker public
    // routing forwards only GET /connect and never passes arbitrary paths/JSON.
    if (path === '/reconcile' && request.method === 'POST') {
      await this.reconcile();
      return new Response(null, { status: 204 });
    }
    if (path !== '/connect' || request.method !== 'GET') return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }
    if (this.state.getWebSockets().length >= MAX_SOCKETS) return new Response('Store busy', { status: 503 });
    // Connect always reconciles D1, including after a missed publish or hibernation.
    await this.reconcile();
    if (!this.snapshot) return new Response('Store not found', { status: 404 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.send(JSON.stringify({ type: 'snapshot', ...this.snapshot }));
    await this.ensureAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  private async reconcile(): Promise<void> {
    // Do not allow an older read to overwrite a newer one across concurrent events.
    await this.state.blockConcurrencyWhile(async () => {
      if (!this.storeId) return;
      const row = await readStoreRevision(primaryEnv(this.env), this.storeId);
      if (!row) return;
      const next = revisionSnapshot(row);
      if (this.snapshot && next.revision < this.snapshot.revision) throw new Error('Revision moved backwards');
      const resources = changedResources(this.snapshot, next);
      this.snapshot = next;
      await this.state.storage.put('snapshot', next);
      if (!resources.length) return;
      const event = JSON.stringify({ type: 'revision', ...next, resources });
      for (const socket of this.state.getWebSockets()) {
        try { socket.send(event); } catch { try { socket.close(1011, 'Reconnect'); } catch { /* already closed */ } }
      }
    });
  }

  private async ensureAlarm(): Promise<void> {
    if (this.state.getWebSockets().length && await this.state.storage.getAlarm() === null) {
      await this.state.storage.setAlarm(Date.now() + RECONCILE_MS);
    }
  }

  async alarm(): Promise<void> {
    if (!this.state.getWebSockets().length) return;
    // Recovery for missed/failed publishes and clock-based subscription expiry.
    // Cost is one small D1 read per ACTIVE STORE per 30s, not per visitor.
    try { await this.reconcile(); } finally {
      if (this.state.getWebSockets().length) await this.state.storage.setAlarm(Date.now() + RECONCILE_MS);
    }
  }

  webSocketMessage(socket: WebSocket, _message: string | ArrayBuffer): void {
    // Public sockets are strictly read-only; ping/pong is handled while asleep.
    socket.close(1008, 'Read-only connection');
  }

  webSocketClose(socket: WebSocket, code: number, reason: string, _wasClean: boolean): void {
    socket.close(code, reason);
  }

  webSocketError(socket: WebSocket, _error: unknown): void {
    socket.close(1011, 'Reconnect');
  }
}
