import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('RiskEngineDO', () => {
  let stub: DurableObjectStub;

  beforeEach(() => {
    const id = env.RISK_ENGINE.newUniqueId();
    stub = env.RISK_ENGINE.get(id);
  });

  it('should accept positions', async () => {
    const positions = [
      { participant_id: 'P001', market: 'solar', volume: 100, avg_price_cents: 12000, current_price_cents: 12500, pnl_cents: 50000 },
      { participant_id: 'P001', market: 'wind', volume: 50, avg_price_cents: 11000, current_price_cents: 10800, pnl_cents: -10000 },
    ];
    const res = await stub.fetch('http://fake/positions', {
      method: 'POST',
      body: JSON.stringify(positions),
    });
    const data = await res.json() as { success: boolean };
    expect(data.success).toBe(true);
  });

  it('should calculate risk metrics with empty positions', async () => {
    const res = await stub.fetch('http://fake/risk');
    const data = await res.json() as { success: boolean; risk: { var_95: number; var_99: number; delta: number } };
    expect(data.success).toBe(true);
    expect(data.risk.var_95).toBe(0);
    expect(data.risk.var_99).toBe(0);
    expect(data.risk.delta).toBe(0);
  });

  it('should calculate risk metrics with positions and price history', async () => {
    // Set positions
    await stub.fetch('http://fake/positions', {
      method: 'POST',
      body: JSON.stringify([
        { participant_id: 'P001', market: 'solar', volume: 100, avg_price_cents: 12000, current_price_cents: 12500, pnl_cents: 50000 },
      ]),
    });

    // Feed price history
    for (let i = 0; i < 30; i++) {
      await stub.fetch('http://fake/price-update', {
        method: 'POST',
        body: JSON.stringify({ market: 'solar', price: 12000 + Math.random() * 1000 }),
      });
    }

    const res = await stub.fetch('http://fake/risk');
    const data = await res.json() as { success: boolean; risk: { var_95: number; var_99: number; cvar: number; sharpe_ratio: number; delta: number; stress_tests: unknown[] } };
    expect(data.success).toBe(true);
    expect(data.risk.delta).toBe(100);
    expect(data.risk.stress_tests).toHaveLength(3);
    expect(typeof data.risk.sharpe_ratio).toBe('number');
  });

  it('should run custom stress test', async () => {
    await stub.fetch('http://fake/positions', {
      method: 'POST',
      body: JSON.stringify([
        { participant_id: 'P001', market: 'solar', volume: 100, avg_price_cents: 12000, current_price_cents: 12500, pnl_cents: 50000 },
      ]),
    });

    const res = await stub.fetch('http://fake/stress-test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Solar crash 50%', price_changes: { solar: -0.50 } }),
    });
    const data = await res.json() as { success: boolean; result: { name: string; portfolio_impact_pct: number } };
    expect(data.success).toBe(true);
    expect(data.result.name).toBe('Solar crash 50%');
    expect(data.result.portfolio_impact_pct).toBe(-50);
  });

  it('should track counterparty exposure', async () => {
    await stub.fetch('http://fake/positions', {
      method: 'POST',
      body: JSON.stringify([
        { participant_id: 'P001', market: 'solar', volume: 100, avg_price_cents: 12000, current_price_cents: 12500, pnl_cents: 50000 },
        { participant_id: 'P002', market: 'wind', volume: 50, avg_price_cents: 11000, current_price_cents: 10800, pnl_cents: -10000 },
      ]),
    });

    const res = await stub.fetch('http://fake/risk');
    const data = await res.json() as { risk: { counterparty_exposure: Record<string, number> } };
    expect(data.risk.counterparty_exposure['P001']).toBeGreaterThan(0);
    expect(data.risk.counterparty_exposure['P002']).toBeGreaterThan(0);
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await stub.fetch('http://fake/unknown');
    expect(res.status).toBe(404);
  });
});
