import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { captureException } from '../utils/sentry';

const network = new Hono<HonoEnv>();
network.use('*', authMiddleware());

// GET /network/graph — Full platform network graph (nodes + edges)
network.get('/graph', async (c) => {
  try {
    const user = c.get('user');
    const isAdmin = user.role === 'admin';

    // Nodes: participants
    const participants = await c.env.DB.prepare(
      'SELECT id, company_name, role, province FROM participants WHERE kyc_status = \'verified\' LIMIT 200'
    ).all();
    const nodes = (participants.results || []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      name: isAdmin ? String(p.company_name) : (String(p.id) === user.sub ? String(p.company_name) : `Participant ${String(p.id).substring(0, 8)}`),
      type: String(p.role),
      province: String(p.province || ''),
    }));

    // Edges: contracts between participants
    const contracts = await c.env.DB.prepare(
      "SELECT creator_id, counterparty_id, document_type, phase, value_cents FROM contract_documents WHERE creator_id IS NOT NULL AND counterparty_id IS NOT NULL AND phase NOT IN ('terminated', 'draft')"
    ).all();
    const edgeMap = new Map<string, { from: string; to: string; types: Set<string>; value_cents: number; count: number }>();
    for (const ct of (contracts.results || [])) {
      const r = ct as Record<string, unknown>;
      const key = [String(r.creator_id), String(r.counterparty_id)].sort().join('|');
      const existing = edgeMap.get(key);
      if (existing) {
        existing.types.add(String(r.document_type || 'contract'));
        existing.value_cents += Number(r.value_cents) || 0;
        existing.count += 1;
      } else {
        edgeMap.set(key, {
          from: String(r.creator_id),
          to: String(r.counterparty_id),
          types: new Set([String(r.document_type || 'contract')]),
          value_cents: Number(r.value_cents) || 0,
          count: 1,
        });
      }
    }

    // Trades between participants
    try {
      const trades = await c.env.DB.prepare(
        "SELECT buyer_id, seller_id, total_cents FROM trades WHERE status = 'settled'"
      ).all();
      for (const tr of (trades.results || [])) {
        const r = tr as Record<string, unknown>;
        const key = [String(r.buyer_id), String(r.seller_id)].sort().join('|');
        const existing = edgeMap.get(key);
        if (existing) {
          existing.types.add('trade');
          existing.value_cents += Number(r.total_cents) || 0;
          existing.count += 1;
        } else {
          edgeMap.set(key, {
            from: String(r.buyer_id),
            to: String(r.seller_id),
            types: new Set(['trade']),
            value_cents: Number(r.total_cents) || 0,
            count: 1,
          });
        }
      }
    } catch { /* trades table may not have buyer_id/seller_id */ }

    const edges = Array.from(edgeMap.values()).map((e) => ({
      from: e.from,
      to: e.to,
      types: Array.from(e.types),
      value_cents: e.value_cents,
      count: e.count,
    }));

    // For non-admin participants, filter to their direct connections + 2 hops
    if (!isAdmin) {
      const myConnections = new Set<string>();
      myConnections.add(user.sub);
      const filteredEdges = edges.filter((e) => e.from === user.sub || e.to === user.sub);
      for (const e of filteredEdges) {
        myConnections.add(e.from);
        myConnections.add(e.to);
      }
      // Second hop
      const hop2Edges = edges.filter((e) => (myConnections.has(e.from) || myConnections.has(e.to)) && !(e.from === user.sub || e.to === user.sub));
      for (const e of hop2Edges) {
        myConnections.add(e.from);
        myConnections.add(e.to);
      }
      const visibleEdges = edges.filter((e) => myConnections.has(e.from) && myConnections.has(e.to));
      const visibleNodes = nodes.filter((n) => myConnections.has(n.id));
      return c.json({ success: true, data: { nodes: visibleNodes, edges: visibleEdges } });
    }

    return c.json({ success: true, data: { nodes, edges } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { nodes: [], edges: [] } });
  }
});

export default network;
