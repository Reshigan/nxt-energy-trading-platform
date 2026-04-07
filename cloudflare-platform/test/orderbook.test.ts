import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('OrderBookDO', () => {
  let stub: DurableObjectStub;

  beforeEach(() => {
    const id = env.ORDER_BOOK.newUniqueId();
    stub = env.ORDER_BOOK.get(id);
  });

  it('should return empty snapshot on new instance', async () => {
    const res = await stub.fetch('http://fake/snapshot');
    const data = await res.json() as { bids: unknown[]; asks: unknown[] };
    expect(res.status).toBe(200);
    expect(data.bids).toEqual([]);
    expect(data.asks).toEqual([]);
  });

  it('should place a limit buy order', async () => {
    const order = {
      id: 'ORD-1',
      participantId: 'P001',
      direction: 'buy',
      market: 'solar',
      volume: 10,
      price: 12500,
      orderType: 'limit',
      validity: 'gtc',
    };
    const res = await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    const data = await res.json() as { success: boolean; order: { id: string }; matches: unknown[] };
    expect(data.success).toBe(true);
    expect(data.order.id).toBe('ORD-1');
    expect(data.matches).toHaveLength(0);

    // Verify it appears on the book
    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { bids: { price: number; volume: number }[]; asks: unknown[] };
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0].price).toBe(12500);
    expect(book.bids[0].volume).toBe(10);
    expect(book.asks).toHaveLength(0);
  });

  it('should place a limit sell order', async () => {
    const order = {
      id: 'ORD-2',
      participantId: 'P002',
      direction: 'sell',
      market: 'solar',
      volume: 5,
      price: 13000,
      orderType: 'limit',
      validity: 'gtc',
    };
    const res = await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    const data = await res.json() as { success: boolean };
    expect(data.success).toBe(true);

    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { bids: unknown[]; asks: { price: number; volume: number }[] };
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].price).toBe(13000);
    expect(book.asks[0].volume).toBe(5);
  });

  it('should match crossing orders', async () => {
    // Place a sell at 12000
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'SELL-1', participantId: 'P002', direction: 'sell',
        market: 'solar', volume: 10, price: 12000, orderType: 'limit', validity: 'gtc',
      }),
    });

    // Place a buy at 12500 — should match against sell at 12000
    const res = await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'BUY-1', participantId: 'P001', direction: 'buy',
        market: 'solar', volume: 7, price: 12500, orderType: 'limit', validity: 'gtc',
      }),
    });
    const data = await res.json() as { success: boolean; matches: { volume: number; price: number }[] };
    expect(data.success).toBe(true);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].volume).toBe(7);
    expect(data.matches[0].price).toBe(12000); // maker's price

    // Sell should have 3 remaining
    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { bids: unknown[]; asks: { volume: number }[] };
    expect(book.bids).toHaveLength(0); // buy fully filled
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].volume).toBe(3); // 10 - 7
  });

  it('should handle market orders', async () => {
    // Place a resting sell
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'SELL-MKT', participantId: 'P002', direction: 'sell',
        market: 'solar', volume: 5, price: 11000, orderType: 'limit', validity: 'gtc',
      }),
    });

    // Market buy should fill immediately
    const res = await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'BUY-MKT', participantId: 'P001', direction: 'buy',
        market: 'solar', volume: 5, orderType: 'market', validity: 'ioc',
      }),
    });
    const data = await res.json() as { success: boolean; matches: unknown[] };
    expect(data.matches).toHaveLength(1);
  });

  it('should cancel an order', async () => {
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'CANCEL-ME', participantId: 'P001', direction: 'buy',
        market: 'solar', volume: 10, price: 12000, orderType: 'limit', validity: 'gtc',
      }),
    });

    const cancelRes = await stub.fetch('http://fake/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'CANCEL-ME' }),
    });
    const cancelData = await cancelRes.json() as { success: boolean };
    expect(cancelData.success).toBe(true);

    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { bids: unknown[]; asks: unknown[] };
    expect(book.bids).toHaveLength(0);
  });

  it('should return 404 when cancelling non-existent order', async () => {
    const res = await stub.fetch('http://fake/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'DOES-NOT-EXIST' }),
    });
    expect(res.status).toBe(404);
  });

  it('should handle iceberg orders (visible qty)', async () => {
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({
        id: 'ICE-1', participantId: 'P002', direction: 'sell',
        market: 'solar', volume: 100, price: 12000, orderType: 'iceberg',
        validity: 'gtc', icebergVisibleQty: 20,
      }),
    });

    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { asks: { volume: number }[] };
    // Iceberg should only show visible qty
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].volume).toBe(20);
  });

  it('should sort bids descending and asks ascending', async () => {
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({ id: 'B1', participantId: 'P001', direction: 'buy', market: 'solar', volume: 5, price: 11000, orderType: 'limit', validity: 'gtc' }),
    });
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({ id: 'B2', participantId: 'P001', direction: 'buy', market: 'solar', volume: 5, price: 12000, orderType: 'limit', validity: 'gtc' }),
    });
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({ id: 'A1', participantId: 'P002', direction: 'sell', market: 'solar', volume: 5, price: 14000, orderType: 'limit', validity: 'gtc' }),
    });
    await stub.fetch('http://fake/order', {
      method: 'POST',
      body: JSON.stringify({ id: 'A2', participantId: 'P002', direction: 'sell', market: 'solar', volume: 5, price: 13000, orderType: 'limit', validity: 'gtc' }),
    });

    const snap = await stub.fetch('http://fake/snapshot');
    const book = await snap.json() as { bids: { price: number }[]; asks: { price: number }[] };
    expect(book.bids[0].price).toBe(12000); // highest bid first
    expect(book.bids[1].price).toBe(11000);
    expect(book.asks[0].price).toBe(13000); // lowest ask first
    expect(book.asks[1].price).toBe(14000);
  });
});
