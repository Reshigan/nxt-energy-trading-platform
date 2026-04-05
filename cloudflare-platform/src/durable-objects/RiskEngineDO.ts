import { DurableObject } from 'cloudflare:workers';

interface Position {
  participant_id: string;
  market: string;
  volume: number;
  avg_price_cents: number;
  current_price_cents: number;
  pnl_cents: number;
}

interface RiskSnapshot {
  var_95: number;
  var_99: number;
  cvar: number;
  sharpe_ratio: number;
  max_drawdown: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  counterparty_exposure: Record<string, number>;
  stress_tests: StressTest[];
  calculated_at: string;
}

interface StressTest {
  name: string;
  scenario: string;
  portfolio_impact_pct: number;
  var_impact_pct: number;
}

export class RiskEngineDO extends DurableObject {
  private positions: Position[] = [];
  private priceHistory: Map<string, number[]> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/positions') {
      const newPositions = await request.json() as Position[];
      this.positions = newPositions;
      await this.ctx.storage.put('positions', this.positions);
      return Response.json({ success: true });
    }

    if (request.method === 'POST' && url.pathname === '/price-update') {
      const { market, price } = await request.json() as { market: string; price: number };
      const history = this.priceHistory.get(market) || [];
      history.push(price);
      if (history.length > 250) history.shift(); // Keep 250 days
      this.priceHistory.set(market, history);
      await this.ctx.storage.put('priceHistory', Object.fromEntries(this.priceHistory));
      return Response.json({ success: true });
    }

    if (request.method === 'GET' && url.pathname === '/risk') {
      const snapshot = this.calculateRisk();
      return Response.json({ success: true, risk: snapshot });
    }

    if (request.method === 'POST' && url.pathname === '/stress-test') {
      const scenario = await request.json() as { name: string; price_changes: Record<string, number> };
      const result = this.runStressTest(scenario.name, scenario.price_changes);
      return Response.json({ success: true, result });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private calculateRisk(): RiskSnapshot {
    // Historical simulation VaR
    const portfolioReturns: number[] = [];
    const markets = [...new Set(this.positions.map((p) => p.market))];

    for (const market of markets) {
      const history = this.priceHistory.get(market) || [];
      if (history.length < 2) continue;
      for (let i = 1; i < history.length; i++) {
        const dailyReturn = (history[i] - history[i - 1]) / history[i - 1];
        portfolioReturns.push(dailyReturn);
      }
    }

    portfolioReturns.sort((a, b) => a - b);
    const n = portfolioReturns.length;
    const totalExposure = this.positions.reduce((sum, p) => sum + Math.abs(p.volume * p.current_price_cents), 0);

    const var95 = n > 0 ? Math.abs(portfolioReturns[Math.floor(n * 0.05)] || 0) * totalExposure / 100 : 0;
    const var99 = n > 0 ? Math.abs(portfolioReturns[Math.floor(n * 0.01)] || 0) * totalExposure / 100 : 0;

    // CVaR: average of losses beyond VaR 95
    const tailIndex = Math.floor(n * 0.05);
    const tailReturns = portfolioReturns.slice(0, tailIndex);
    const cvar = tailReturns.length > 0
      ? Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * totalExposure / 100
      : 0;

    // Sharpe ratio
    const avgReturn = n > 0 ? portfolioReturns.reduce((s, r) => s + r, 0) / n : 0;
    const stdDev = n > 0
      ? Math.sqrt(portfolioReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / n)
      : 1;
    const riskFreeRate = 0.0775 / 252; // SA repo rate daily
    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumReturn = 0;
    for (const r of portfolioReturns) {
      cumReturn += r;
      if (cumReturn > peak) peak = cumReturn;
      const drawdown = peak - cumReturn;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Counterparty exposure (simplified)
    const counterpartyExposure: Record<string, number> = {};
    for (const pos of this.positions) {
      const key = pos.participant_id;
      counterpartyExposure[key] = (counterpartyExposure[key] || 0) + Math.abs(pos.volume * pos.current_price_cents);
    }

    // Stress tests
    const stressTests: StressTest[] = [
      this.runStressTest('Eskom 40% tariff increase', { solar: 0.15, wind: 0.10, gas: 0.40, carbon: 0.05 }),
      this.runStressTest('Solar -30% generation', { solar: -0.30, wind: -0.10 }),
      this.runStressTest('Carbon price crash 50%', { carbon: -0.50 }),
    ];

    return {
      var_95: Math.round(var95),
      var_99: Math.round(var99),
      cvar: Math.round(cvar),
      sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
      max_drawdown: Math.round(maxDrawdown * 10000) / 100,
      delta: this.positions.reduce((s, p) => s + p.volume, 0),
      gamma: 0, // simplified
      theta: 0,
      vega: 0,
      counterparty_exposure: counterpartyExposure,
      stress_tests: stressTests,
      calculated_at: new Date().toISOString(),
    };
  }

  private runStressTest(name: string, priceChanges: Record<string, number>): StressTest {
    let totalImpact = 0;
    let totalExposure = 0;

    for (const pos of this.positions) {
      const change = priceChanges[pos.market] || 0;
      const exposure = pos.volume * pos.current_price_cents;
      totalExposure += Math.abs(exposure);
      totalImpact += exposure * change;
    }

    return {
      name,
      scenario: JSON.stringify(priceChanges),
      portfolio_impact_pct: totalExposure > 0 ? Math.round((totalImpact / totalExposure) * 10000) / 100 : 0,
      var_impact_pct: 0,
    };
  }

  override async alarm(): Promise<void> {
    this.calculateRisk();
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }
}
