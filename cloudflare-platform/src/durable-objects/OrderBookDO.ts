import { generateId, nowISO } from '../utils/id';

interface Order {
  id: string;
  participantId: string;
  direction: 'buy' | 'sell';
  market: string;
  volume: number;
  remainingQty: number;
  price: number; // cents
  orderType: string;
  validity: string;
  timestamp: string;
  icebergVisibleQty?: number;
  icebergTotalQty?: number;
  triggerPrice?: number;
}

interface Match {
  tradeId: string;
  buyerId: string;
  sellerId: string;
  buyOrderId: string;
  sellOrderId: string;
  volume: number;
  price: number;
  market: string;
  timestamp: string;
}

interface BookLevel {
  price: number;
  volume: number;
  orderCount: number;
}

export class OrderBookDO implements DurableObject {
  private bids: Order[] = []; // sorted descending by price, then ascending by time
  private asks: Order[] = []; // sorted ascending by price, then ascending by time
  private trades: Match[] = [];
  private sessions: Map<string, WebSocket> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    // Restore state from storage
    this.state.blockConcurrencyWhile(async () => {
      this.bids = (await this.state.storage.get<Order[]>('bids')) || [];
      this.asks = (await this.state.storage.get<Order[]>('asks')) || [];
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket();
    }

    switch (url.pathname) {
      case '/order':
        return this.handleOrder(request);
      case '/cancel':
        return this.handleCancel(request);
      case '/snapshot':
        return this.handleSnapshot();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private handleWebSocket(): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const sessionId = generateId();

    this.state.acceptWebSocket(server);
    this.sessions.set(sessionId, server);

    // Send snapshot on connect
    server.send(JSON.stringify({
      type: 'snapshot',
      bids: this.getBookLevels(this.bids),
      asks: this.getBookLevels(this.asks),
    }));

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleOrder(request: Request): Promise<Response> {
    const body = await request.json() as {
      id: string;
      participantId: string;
      direction: 'buy' | 'sell';
      market: string;
      volume: number;
      price?: number;
      orderType: string;
      validity: string;
      icebergVisibleQty?: number;
      triggerPrice?: number;
    };

    const order: Order = {
      id: body.id,
      participantId: body.participantId,
      direction: body.direction,
      market: body.market,
      volume: body.volume,
      remainingQty: body.volume,
      price: body.price || 0,
      orderType: body.orderType,
      validity: body.validity,
      timestamp: nowISO(),
      icebergVisibleQty: body.icebergVisibleQty,
      icebergTotalQty: body.volume,
      triggerPrice: body.triggerPrice,
    };

    // Handle stop/take-profit orders — just add to book, they trigger when price hits level
    if (order.orderType === 'stop_loss' || order.orderType === 'take_profit') {
      this.insertToBook(order);
      await this.persistState();
      this.broadcastUpdate();
      return Response.json({ success: true, order, matches: [] });
    }

    // Match the order
    const matches = this.matchOrder(order);

    // If remaining qty and it's a limit order, add to book
    if (order.remainingQty > 0 && order.orderType === 'limit') {
      this.insertToBook(order);
    }

    await this.persistState();

    // Broadcast updates
    for (const match of matches) {
      this.broadcastTrade(match);
    }
    this.broadcastUpdate();

    return Response.json({ success: true, order, matches });
  }

  private matchOrder(incoming: Order): Match[] {
    const matches: Match[] = [];
    const oppositeSide = incoming.direction === 'buy' ? this.asks : this.bids;

    while (incoming.remainingQty > 0 && oppositeSide.length > 0) {
      const best = oppositeSide[0];

      // Price check for limit orders
      if (incoming.orderType !== 'market') {
        if (incoming.direction === 'buy' && incoming.price < best.price) break;
        if (incoming.direction === 'sell' && incoming.price > best.price) break;
      }

      const fillQty = Math.min(incoming.remainingQty, best.remainingQty);
      const fillPrice = best.price; // maker's price

      const buyerId = incoming.direction === 'buy' ? incoming.participantId : best.participantId;
      const sellerId = incoming.direction === 'sell' ? incoming.participantId : best.participantId;
      const buyOrderId = incoming.direction === 'buy' ? incoming.id : best.id;
      const sellOrderId = incoming.direction === 'sell' ? incoming.id : best.id;

      matches.push({
        tradeId: generateId(),
        buyerId,
        sellerId,
        buyOrderId,
        sellOrderId,
        volume: fillQty,
        price: fillPrice,
        market: incoming.market,
        timestamp: nowISO(),
      });

      incoming.remainingQty -= fillQty;
      best.remainingQty -= fillQty;

      // Handle iceberg orders
      if (best.remainingQty === 0 && best.orderType === 'iceberg' && best.icebergTotalQty) {
        const filled = best.volume - (best.icebergTotalQty - fillQty);
        if (filled < best.icebergTotalQty) {
          best.remainingQty = Math.min(best.icebergVisibleQty || best.volume, best.icebergTotalQty - filled);
        }
      }

      if (best.remainingQty === 0) {
        oppositeSide.shift();
      }
    }

    return matches;
  }

  private insertToBook(order: Order): void {
    if (order.direction === 'buy') {
      // Insert into bids (descending by price, ascending by time)
      const idx = this.bids.findIndex((o) => o.price < order.price);
      if (idx === -1) this.bids.push(order);
      else this.bids.splice(idx, 0, order);
    } else {
      // Insert into asks (ascending by price, ascending by time)
      const idx = this.asks.findIndex((o) => o.price > order.price);
      if (idx === -1) this.asks.push(order);
      else this.asks.splice(idx, 0, order);
    }
  }

  private async handleCancel(request: Request): Promise<Response> {
    const { orderId } = await request.json() as { orderId: string };

    let found = false;
    this.bids = this.bids.filter((o) => {
      if (o.id === orderId) { found = true; return false; }
      return true;
    });
    if (!found) {
      this.asks = this.asks.filter((o) => {
        if (o.id === orderId) { found = true; return false; }
        return true;
      });
    }

    if (!found) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    await this.persistState();
    this.broadcastUpdate();
    return Response.json({ success: true });
  }

  private handleSnapshot(): Response {
    return Response.json({
      bids: this.getBookLevels(this.bids),
      asks: this.getBookLevels(this.asks),
    });
  }

  private getBookLevels(orders: Order[]): BookLevel[] {
    const levels: Map<number, { volume: number; count: number }> = new Map();
    for (const order of orders) {
      const existing = levels.get(order.price) || { volume: 0, count: 0 };
      const visibleQty = order.orderType === 'iceberg'
        ? Math.min(order.icebergVisibleQty || order.remainingQty, order.remainingQty)
        : order.remainingQty;
      existing.volume += visibleQty;
      existing.count += 1;
      levels.set(order.price, existing);
    }
    return Array.from(levels.entries()).map(([price, { volume, count }]) => ({
      price,
      volume,
      orderCount: count,
    }));
  }

  private broadcastUpdate(): void {
    const message = JSON.stringify({
      type: 'update',
      bids: this.getBookLevels(this.bids),
      asks: this.getBookLevels(this.asks),
    });
    for (const ws of this.sessions.values()) {
      try { ws.send(message); } catch { /* client disconnected */ }
    }
  }

  private broadcastTrade(match: Match): void {
    const message = JSON.stringify({
      type: 'trade',
      id: match.tradeId,
      price: match.price,
      volume: match.volume,
      timestamp: match.timestamp,
    });
    for (const ws of this.sessions.values()) {
      try { ws.send(message); } catch { /* client disconnected */ }
    }
  }

  private async persistState(): Promise<void> {
    await this.state.storage.put('bids', this.bids);
    await this.state.storage.put('asks', this.asks);
  }
}
