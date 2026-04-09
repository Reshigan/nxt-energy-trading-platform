import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('EscrowManagerDO', () => {
  let stub: DurableObjectStub;

  beforeEach(() => {
    const id = env.ESCROW_MGR.newUniqueId();
    stub = env.ESCROW_MGR.get(id);
  });

  it('should create a new escrow', async () => {
    const res = await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({
        id: 'ESC-1',
        depositorId: 'P001',
        beneficiaryId: 'P002',
        amountCents: 100000,
      }),
    });
    const data = await res.json() as { success: boolean; escrow: { status: string; id: string } };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('created');
    expect(data.escrow.id).toBe('ESC-1');
  });

  it('should reject duplicate escrow creation', async () => {
    const body = JSON.stringify({ id: 'ESC-DUP', depositorId: 'P001', amountCents: 50000 });
    await stub.fetch('http://fake/create', { method: 'POST', body });
    const res = await stub.fetch('http://fake/create', { method: 'POST', body });
    expect(res.status).toBe(409);
  });

  it('should transition created → funded', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-F', depositorId: 'P001', amountCents: 100000 }),
    });
    const res = await stub.fetch('http://fake/fund', {
      method: 'POST',
      body: JSON.stringify({ actor: 'P001' }),
    });
    const data = await res.json() as { success: boolean; escrow: { status: string; fundedAt: string } };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('funded');
    expect(data.escrow.fundedAt).toBeTruthy();
  });

  it('should reject invalid state transition', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-BAD', depositorId: 'P001', amountCents: 100000 }),
    });
    // Try to hold without funding first
    const res = await stub.fetch('http://fake/hold', {
      method: 'POST',
      body: JSON.stringify({ actor: 'P001' }),
    });
    expect(res.status).toBe(400);
  });

  it('should transition funded → held → released', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-R', depositorId: 'P001', amountCents: 100000 }),
    });
    await stub.fetch('http://fake/fund', { method: 'POST', body: JSON.stringify({}) });
    await stub.fetch('http://fake/hold', { method: 'POST', body: JSON.stringify({}) });

    const res = await stub.fetch('http://fake/release', {
      method: 'POST',
      body: JSON.stringify({ actor: 'escrow-agent', reason: 'Conditions met' }),
    });
    const data = await res.json() as { success: boolean; escrow: { status: string; releasedAt: string } };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('released');
    expect(data.escrow.releasedAt).toBeTruthy();
  });

  it('should release directly from funded state', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-DR', depositorId: 'P001', amountCents: 50000 }),
    });
    await stub.fetch('http://fake/fund', { method: 'POST', body: JSON.stringify({}) });

    const res = await stub.fetch('http://fake/release', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Early release' }),
    });
    const data = await res.json() as { success: boolean; escrow: { status: string } };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('released');
  });

  it('should dispute a held escrow', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-D', depositorId: 'P001', amountCents: 100000 }),
    });
    await stub.fetch('http://fake/fund', { method: 'POST', body: JSON.stringify({}) });
    await stub.fetch('http://fake/hold', { method: 'POST', body: JSON.stringify({}) });

    const res = await stub.fetch('http://fake/dispute', {
      method: 'POST',
      body: JSON.stringify({ actor: 'P002', reason: 'Quality dispute' }),
    });
    const data = await res.json() as { success: boolean; escrow: { status: string } };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('disputed');
  });

  it('should return status with transition history', async () => {
    await stub.fetch('http://fake/create', {
      method: 'POST',
      body: JSON.stringify({ id: 'ESC-S', depositorId: 'P001', amountCents: 100000 }),
    });
    await stub.fetch('http://fake/fund', { method: 'POST', body: JSON.stringify({}) });

    const res = await stub.fetch('http://fake/status');
    const data = await res.json() as { success: boolean; escrow: { status: string }; transitions: { from: string; to: string }[] };
    expect(data.success).toBe(true);
    expect(data.escrow.status).toBe('funded');
    expect(data.transitions).toHaveLength(2); // none→created, created→funded
    expect(data.transitions[0].to).toBe('created');
    expect(data.transitions[1].to).toBe('funded');
  });

  it('should return 404 for non-existent escrow operations', async () => {
    const res = await stub.fetch('http://fake/fund', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});
