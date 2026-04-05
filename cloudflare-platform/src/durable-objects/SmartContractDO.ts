import { DurableObject } from 'cloudflare:workers';

interface SmartContractRule {
  id: string;
  contract_doc_id: string;
  rule_type: string;
  trigger_condition: Record<string, unknown>;
  action: Record<string, unknown>;
  enabled: boolean;
}

export class SmartContractDO extends DurableObject {
  private rules: SmartContractRule[] = [];

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/rules') {
      const rule = await request.json() as SmartContractRule;
      this.rules.push(rule);
      await this.ctx.storage.put('rules', this.rules);
      return Response.json({ success: true, rule_id: rule.id });
    }

    if (request.method === 'GET' && url.pathname === '/rules') {
      return Response.json({ success: true, rules: this.rules });
    }

    if (request.method === 'PUT' && url.pathname === '/rules/toggle') {
      const { rule_id, enabled } = await request.json() as { rule_id: string; enabled: boolean };
      const rule = this.rules.find((r) => r.id === rule_id);
      if (rule) {
        rule.enabled = enabled;
        await this.ctx.storage.put('rules', this.rules);
      }
      return Response.json({ success: true });
    }

    if (request.method === 'POST' && url.pathname === '/evaluate') {
      const event = await request.json() as { event_type: string; data: Record<string, unknown> };
      const triggered = this.evaluateRules(event.event_type, event.data);
      return Response.json({ success: true, triggered });
    }

    if (request.method === 'DELETE') {
      const { rule_id } = await request.json() as { rule_id: string };
      this.rules = this.rules.filter((r) => r.id !== rule_id);
      await this.ctx.storage.put('rules', this.rules);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private evaluateRules(eventType: string, data: Record<string, unknown>): string[] {
    const triggeredRuleIds: string[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const condition = rule.trigger_condition;
      let shouldTrigger = false;

      switch (rule.rule_type) {
        case 'metering_trigger':
          shouldTrigger = eventType === 'meter_reading';
          break;
        case 'payment_trigger':
          shouldTrigger = eventType === 'payment_confirmed';
          break;
        case 'threshold_alert':
          if (condition.field && condition.threshold) {
            const value = data[condition.field as string] as number;
            shouldTrigger = value > (condition.threshold as number);
          }
          break;
        case 'auto_invoice':
          shouldTrigger = eventType === 'month_end' || eventType === 'meter_reading';
          break;
        case 'auto_settle':
          shouldTrigger = eventType === 'payment_confirmed' || eventType === 'metering_validated';
          break;
        case 'auto_penalty':
          if (data.delivered_volume !== undefined && condition.contracted_volume && condition.tolerance_pct) {
            const delivered = data.delivered_volume as number;
            const contracted = condition.contracted_volume as number;
            const tolerance = condition.tolerance_pct as number;
            shouldTrigger = delivered < contracted * (1 - tolerance / 100);
          }
          break;
        case 'auto_escalation':
          shouldTrigger = eventType === 'contract_anniversary';
          break;
        case 'auto_renewal':
          shouldTrigger = eventType === 'tenor_expiry_approaching';
          break;
      }

      if (shouldTrigger) {
        triggeredRuleIds.push(rule.id);
      }
    }

    return triggeredRuleIds;
  }

  override async alarm(): Promise<void> {
    // Evaluate time-based rules every minute
    this.evaluateRules('timer_tick', { timestamp: new Date().toISOString() });
    await this.ctx.storage.setAlarm(Date.now() + 60 * 1000);
  }
}
