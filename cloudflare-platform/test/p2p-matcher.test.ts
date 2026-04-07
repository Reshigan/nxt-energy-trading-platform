import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('P2PMatcherDO', () => {
  let stub: DurableObjectStub;

  beforeEach(() => {
    const id = env.P2P_MATCHER.newUniqueId();
    stub = env.P2P_MATCHER.get(id);
  });

  it('should accept a new offer', async () => {
    const res = await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({
        id: 'OFF-1',
        participant_id: 'P001',
        volume_kwh: 500,
        price_cents_per_kwh: 120,
        distribution_zone: 'gauteng',
        offer_type: 'sell',
        expires_at: '2030-01-01T00:00:00Z',
      }),
    });
    const data = await res.json() as { success: boolean; offer_id: string };
    expect(data.success).toBe(true);
    expect(data.offer_id).toBe('OFF-1');
  });

  it('should list all offers', async () => {
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'O1', participant_id: 'P001', volume_kwh: 100, price_cents_per_kwh: 100, distribution_zone: 'gauteng', offer_type: 'sell', expires_at: '2030-01-01T00:00:00Z' }),
    });
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'O2', participant_id: 'P002', volume_kwh: 80, price_cents_per_kwh: 110, distribution_zone: 'gauteng', offer_type: 'buy', expires_at: '2030-01-01T00:00:00Z' }),
    });

    const res = await stub.fetch('http://fake/offers');
    const data = await res.json() as { success: boolean; offers: unknown[] };
    expect(data.success).toBe(true);
    expect(data.offers).toHaveLength(2);
  });

  it('should match compatible offers in same zone', async () => {
    // Sell at 100
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'S1', participant_id: 'P001', volume_kwh: 100, price_cents_per_kwh: 100, distribution_zone: 'gauteng', offer_type: 'sell', expires_at: '2030-01-01T00:00:00Z' }),
    });
    // Buy at 120 (price >= sell price, so they cross)
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'B1', participant_id: 'P002', volume_kwh: 80, price_cents_per_kwh: 120, distribution_zone: 'gauteng', offer_type: 'buy', expires_at: '2030-01-01T00:00:00Z' }),
    });

    const res = await stub.fetch('http://fake/match', { method: 'POST' });
    const data = await res.json() as { success: boolean; matches: { volume_kwh: number; price_cents_per_kwh: number }[] };
    expect(data.success).toBe(true);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].volume_kwh).toBe(80); // min(100, 80)
    expect(data.matches[0].price_cents_per_kwh).toBe(110); // avg(100, 120)
  });

  it('should NOT match offers in different zones', async () => {
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'S-Z1', participant_id: 'P001', volume_kwh: 100, price_cents_per_kwh: 100, distribution_zone: 'gauteng', offer_type: 'sell', expires_at: '2030-01-01T00:00:00Z' }),
    });
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'B-Z2', participant_id: 'P002', volume_kwh: 100, price_cents_per_kwh: 150, distribution_zone: 'western_cape', offer_type: 'buy', expires_at: '2030-01-01T00:00:00Z' }),
    });

    const res = await stub.fetch('http://fake/match', { method: 'POST' });
    const data = await res.json() as { success: boolean; matches: unknown[] };
    expect(data.matches).toHaveLength(0);
  });

  it('should NOT match if buy price < sell price', async () => {
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'S-NM', participant_id: 'P001', volume_kwh: 100, price_cents_per_kwh: 200, distribution_zone: 'gauteng', offer_type: 'sell', expires_at: '2030-01-01T00:00:00Z' }),
    });
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'B-NM', participant_id: 'P002', volume_kwh: 100, price_cents_per_kwh: 100, distribution_zone: 'gauteng', offer_type: 'buy', expires_at: '2030-01-01T00:00:00Z' }),
    });

    const res = await stub.fetch('http://fake/match', { method: 'POST' });
    const data = await res.json() as { success: boolean; matches: unknown[] };
    expect(data.matches).toHaveLength(0);
  });

  it('should delete an offer', async () => {
    await stub.fetch('http://fake/offer', {
      method: 'POST',
      body: JSON.stringify({ id: 'DEL-1', participant_id: 'P001', volume_kwh: 100, price_cents_per_kwh: 100, distribution_zone: 'gauteng', offer_type: 'sell', expires_at: '2030-01-01T00:00:00Z' }),
    });
    await stub.fetch('http://fake/', {
      method: 'DELETE',
      body: JSON.stringify({ offer_id: 'DEL-1' }),
    });

    const res = await stub.fetch('http://fake/offers');
    const data = await res.json() as { offers: unknown[] };
    expect(data.offers).toHaveLength(0);
  });
});
