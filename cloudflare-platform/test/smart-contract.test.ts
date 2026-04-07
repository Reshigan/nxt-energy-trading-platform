import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('SmartContractDO', () => {
  let stub: DurableObjectStub;

  beforeEach(() => {
    const id = env.SMART_CONTRACT.newUniqueId();
    stub = env.SMART_CONTRACT.get(id);
  });

  it('should add a rule', async () => {
    const rule = {
      id: 'RULE-1',
      contract_doc_id: 'DOC-1',
      rule_type: 'metering_trigger',
      trigger_condition: { field: 'kwh', threshold: 1000 },
      action: { type: 'generate_invoice' },
      enabled: true,
    };
    const res = await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    const data = await res.json() as { success: boolean; rule_id: string };
    expect(data.success).toBe(true);
    expect(data.rule_id).toBe('RULE-1');
  });

  it('should list rules', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'R1', contract_doc_id: 'D1', rule_type: 'payment_trigger', trigger_condition: {}, action: {}, enabled: true }),
    });
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'R2', contract_doc_id: 'D1', rule_type: 'auto_invoice', trigger_condition: {}, action: {}, enabled: false }),
    });

    const res = await stub.fetch('http://fake/rules');
    const data = await res.json() as { success: boolean; rules: unknown[] };
    expect(data.rules).toHaveLength(2);
  });

  it('should toggle rule enabled state', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'R-TOG', contract_doc_id: 'D1', rule_type: 'payment_trigger', trigger_condition: {}, action: {}, enabled: true }),
    });

    await stub.fetch('http://fake/rules/toggle', {
      method: 'PUT',
      body: JSON.stringify({ rule_id: 'R-TOG', enabled: false }),
    });

    const res = await stub.fetch('http://fake/rules');
    const data = await res.json() as { rules: { id: string; enabled: boolean }[] };
    const rule = data.rules.find((r) => r.id === 'R-TOG');
    expect(rule?.enabled).toBe(false);
  });

  it('should evaluate metering_trigger rules', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'METER-R', contract_doc_id: 'D1', rule_type: 'metering_trigger', trigger_condition: {}, action: { type: 'invoice' }, enabled: true }),
    });

    const res = await stub.fetch('http://fake/evaluate', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'meter_reading', data: { kwh: 500 } }),
    });
    const data = await res.json() as { success: boolean; triggered: string[] };
    expect(data.triggered).toContain('METER-R');
  });

  it('should NOT trigger disabled rules', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'DIS-R', contract_doc_id: 'D1', rule_type: 'metering_trigger', trigger_condition: {}, action: {}, enabled: false }),
    });

    const res = await stub.fetch('http://fake/evaluate', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'meter_reading', data: {} }),
    });
    const data = await res.json() as { triggered: string[] };
    expect(data.triggered).not.toContain('DIS-R');
  });

  it('should evaluate threshold_alert rules', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'THRESH-R', contract_doc_id: 'D1', rule_type: 'threshold_alert', trigger_condition: { field: 'temperature', threshold: 50 }, action: {}, enabled: true }),
    });

    // Above threshold
    const res1 = await stub.fetch('http://fake/evaluate', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'sensor_reading', data: { temperature: 60 } }),
    });
    const data1 = await res1.json() as { triggered: string[] };
    expect(data1.triggered).toContain('THRESH-R');

    // Below threshold
    const res2 = await stub.fetch('http://fake/evaluate', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'sensor_reading', data: { temperature: 30 } }),
    });
    const data2 = await res2.json() as { triggered: string[] };
    expect(data2.triggered).not.toContain('THRESH-R');
  });

  it('should evaluate auto_penalty rules', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({
        id: 'PEN-R', contract_doc_id: 'D1', rule_type: 'auto_penalty',
        trigger_condition: { contracted_volume: 1000, tolerance_pct: 10 },
        action: { type: 'penalty_invoice' }, enabled: true,
      }),
    });

    // Under-delivery (800 < 1000 * 0.9 = 900)
    const res = await stub.fetch('http://fake/evaluate', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'metering_validated', data: { delivered_volume: 800 } }),
    });
    const data = await res.json() as { triggered: string[] };
    expect(data.triggered).toContain('PEN-R');
  });

  it('should delete a rule', async () => {
    await stub.fetch('http://fake/rules', {
      method: 'POST',
      body: JSON.stringify({ id: 'DEL-R', contract_doc_id: 'D1', rule_type: 'payment_trigger', trigger_condition: {}, action: {}, enabled: true }),
    });

    await stub.fetch('http://fake/', {
      method: 'DELETE',
      body: JSON.stringify({ rule_id: 'DEL-R' }),
    });

    const res = await stub.fetch('http://fake/rules');
    const data = await res.json() as { rules: unknown[] };
    expect(data.rules).toHaveLength(0);
  });
});
