import { AppBindings } from '../utils/types';
import { generateId } from '../utils/id';

export async function runAMLChecks(env: AppBindings, participantId: string): Promise<number> {
  let alertsCreated = 0;

  const rules = await env.DB.prepare('SELECT * FROM aml_rules WHERE active = 1').all();
  for (const rule of rules.results) {
    const params = JSON.parse(rule.parameters as string) as Record<string, number>;
    let triggered = false;
    let description = '';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let alertType = 'pattern_anomaly';
    let relatedTradeIds = '';

    switch (rule.rule_type as string) {
      case 'threshold': {
        const maxCents = params.max_cents ?? 50000000;
        const windowHours = params.window_hours ?? 1;
        const big = await env.DB.prepare(
          "SELECT id, total_cents FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND total_cents > ? AND created_at >= datetime('now', ?)"
        ).bind(participantId, participantId, maxCents, `-${windowHours} hours`).all();
        if (big.results.length > 0) {
          triggered = true;
          alertType = 'threshold_breach';
          severity = 'high';
          description = `${big.results.length} trade(s) exceeding R${(maxCents / 100).toLocaleString()} in the last ${windowHours}h`;
          relatedTradeIds = big.results.map((r) => r.id as string).join(',');
        }
        break;
      }
      case 'frequency': {
        const maxOrders = params.max_orders ?? 100;
        const windowMins = params.window_minutes ?? 60;
        const cnt = await env.DB.prepare(
          "SELECT COUNT(*) as c FROM orders WHERE participant_id = ? AND created_at >= datetime('now', ?)"
        ).bind(participantId, `-${windowMins} minutes`).first<{ c: number }>();
        if ((cnt?.c ?? 0) > maxOrders) {
          triggered = true;
          alertType = 'rapid_trading';
          severity = 'medium';
          description = `${cnt?.c} orders in ${windowMins} minutes (limit: ${maxOrders})`;
        }
        break;
      }
      case 'pattern': {
        if ((rule.rule_name as string).includes('Wash')) {
          const roundtrips = params.min_roundtrips ?? 3;
          const windowH = params.window_hours ?? 24;
          const buys = await env.DB.prepare(
            "SELECT COUNT(*) as c FROM trades WHERE buyer_id = ? AND created_at >= datetime('now', ?)"
          ).bind(participantId, `-${windowH} hours`).first<{ c: number }>();
          const sells = await env.DB.prepare(
            "SELECT COUNT(*) as c FROM trades WHERE seller_id = ? AND created_at >= datetime('now', ?)"
          ).bind(participantId, `-${windowH} hours`).first<{ c: number }>();
          const trips = Math.min(buys?.c ?? 0, sells?.c ?? 0);
          if (trips >= roundtrips) {
            triggered = true;
            alertType = 'wash_trading';
            severity = 'critical';
            description = `${trips} buy-sell roundtrips in ${windowH}h (threshold: ${roundtrips})`;
          }
        }
        break;
      }
      case 'structuring': {
        const threshold = params.threshold_cents ?? 10000000;
        const maxSplits = params.max_splits ?? 5;
        const windowH = params.window_hours ?? 24;
        const small = await env.DB.prepare(
          "SELECT COUNT(*) as c FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND total_cents BETWEEN ? AND ? AND created_at >= datetime('now', ?)"
        ).bind(participantId, participantId, Math.floor(threshold * 0.5), threshold - 1, `-${windowH} hours`).first<{ c: number }>();
        if ((small?.c ?? 0) >= maxSplits) {
          triggered = true;
          alertType = 'structuring';
          severity = 'high';
          description = `${small?.c} trades just below R${(threshold / 100).toLocaleString()} threshold in ${windowH}h`;
        }
        break;
      }
    }

    if (triggered) {
      const existing = await env.DB.prepare(
        "SELECT id FROM aml_alerts WHERE participant_id = ? AND alert_type = ? AND status IN ('open','investigating') AND created_at >= datetime('now', '-24 hours')"
      ).bind(participantId, alertType).first();
      if (!existing) {
        await env.DB.prepare(
          'INSERT INTO aml_alerts (id, participant_id, alert_type, severity, description, related_trade_ids) VALUES (?,?,?,?,?,?)'
        ).bind(generateId(), participantId, alertType, severity, description, relatedTradeIds || null).run();
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}
