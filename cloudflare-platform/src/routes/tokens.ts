import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { sha256 } from '../utils/hash';
import { cascade } from '../utils/cascade';

const tokens = new Hono<HonoEnv>();
tokens.use('*', authMiddleware());

// POST /tokens/mint — Tokenize a carbon credit or REC
tokens.post('/mint', async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as { source_type: 'carbon_credit' | 'rec'; source_id: string };

  // Validate ownership
  let source: Record<string, unknown> | null = null;
  if (body.source_type === 'carbon_credit') {
    source = await c.env.DB.prepare('SELECT * FROM carbon_credits WHERE id = ? AND owner_id = ?').bind(body.source_id, user.sub).first();
    if (!source) return c.json({ success: false, error: 'Credit not found or not owned by you' }, 404);
    if (source.status !== 'active') return c.json({ success: false, error: 'Only active credits can be tokenized' }, 400);
  } else if (body.source_type === 'rec') {
    source = await c.env.DB.prepare('SELECT * FROM recs WHERE id = ? AND owner_id = ?').bind(body.source_id, user.sub).first();
    if (!source) return c.json({ success: false, error: 'REC not found or not owned by you' }, 404);
    if (source.status !== 'active') return c.json({ success: false, error: 'Only active RECs can be tokenized' }, 400);
  } else {
    return c.json({ success: false, error: 'source_type must be carbon_credit or rec' }, 400);
  }

  // Generate token ID
  const registry = (source.registry || source.standard || 'NXT') as string;
  const serial = (source.serial_number || source.certificate_number || source.id) as string;
  const tokenId = `NXT-${body.source_type === 'carbon_credit' ? 'CC' : 'REC'}-${registry}-${serial}`.replace(/[^A-Za-z0-9-]/g, '');

  // Check not already tokenized
  const existing = await c.env.DB.prepare('SELECT id FROM tokenised_assets WHERE source_id = ?').bind(body.source_id).first();
  if (existing) return c.json({ success: false, error: 'Asset already tokenized' }, 409);

  // Compute hash
  const quantity = (source.quantity || source.volume_mwh || 0) as number;
  const unit = body.source_type === 'carbon_credit' ? 'tCO2e' : 'MWh';
  const metadata = JSON.stringify({ source_type: body.source_type, registry, serial, project: source.project_name || source.project_id, vintage: source.vintage });
  const hashInput = `${tokenId}|${serial}|${quantity}|${user.sub}|${nowISO()}`;
  const encoder = new TextEncoder();
  const tokenHash = await sha256(encoder.encode(hashInput).buffer as ArrayBuffer);

  const id = generateId();
  const mintedAt = nowISO();
  const provenanceChain = JSON.stringify([{ action: 'minted', by: user.sub, at: mintedAt, hash: tokenHash }]);

  await c.env.DB.prepare(
    `INSERT INTO tokenised_assets (id, asset_type, source_id, token_id, token_hash, owner_id, quantity, unit, metadata, status, provenance_chain, minted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).bind(id, body.source_type, body.source_id, tokenId, tokenHash, user.sub, quantity, unit, metadata, provenanceChain, mintedAt).run();

  c.executionCtx.waitUntil(cascade(c.env, {
    type: 'token.minted', actor_id: user.sub, entity_type: 'token', entity_id: id,
    data: { token_id: tokenId, source_type: body.source_type, quantity, unit }, ip: c.req.header('x-forwarded-for') || '',
  }));

  return c.json({ success: true, data: { id, token_id: tokenId, token_hash: tokenHash, quantity, unit } }, 201);
});

// GET /tokens/:tokenId/verify — Public verification
tokens.get('/:tokenId/verify', async (c) => {
  const { tokenId } = c.req.param();
  const token = await c.env.DB.prepare('SELECT * FROM tokenised_assets WHERE token_id = ?').bind(tokenId).first();
  if (!token) return c.json({ success: false, error: 'Token not found', valid: false }, 404);

  const provenance = JSON.parse(token.provenance_chain as string);

  return c.json({
    success: true, valid: true,
    data: {
      token_id: token.token_id,
      asset_type: token.asset_type,
      quantity: token.quantity,
      unit: token.unit,
      status: token.status,
      owner_id: token.owner_id,
      minted_at: token.minted_at,
      metadata: JSON.parse(token.metadata as string),
      provenance,
      hash_on_record: token.token_hash,
    },
  });
});

// POST /tokens/:id/transfer — Transfer token
tokens.post('/:id/transfer', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json() as { to_participant_id: string; notes?: string };

  const token = await c.env.DB.prepare('SELECT * FROM tokenised_assets WHERE id = ? AND owner_id = ?').bind(id, user.sub).first();
  if (!token) return c.json({ success: false, error: 'Token not found' }, 404);
  if (token.status !== 'active') return c.json({ success: false, error: 'Only active tokens can be transferred' }, 400);

  const recipient = await c.env.DB.prepare('SELECT id FROM participants WHERE id = ?').bind(body.to_participant_id).first();
  if (!recipient) return c.json({ success: false, error: 'Recipient not found' }, 404);

  const now = nowISO();
  const provenance = JSON.parse(token.provenance_chain as string);
  const encoder = new TextEncoder();
  const transferHash = await sha256(encoder.encode(`${token.token_id}|transfer|${user.sub}|${body.to_participant_id}|${now}`).buffer as ArrayBuffer);
  provenance.push({ action: 'transferred', from: user.sub, to: body.to_participant_id, at: now, hash: transferHash, notes: body.notes });

  await c.env.DB.prepare(
    'UPDATE tokenised_assets SET owner_id = ?, provenance_chain = ?, transferred_at = ? WHERE id = ?'
  ).bind(body.to_participant_id, JSON.stringify(provenance), now, id).run();

  return c.json({ success: true, message: 'Token transferred' });
});

// POST /tokens/:id/retire — Permanently retire/burn token
tokens.post('/:id/retire', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const token = await c.env.DB.prepare('SELECT * FROM tokenised_assets WHERE id = ? AND owner_id = ?').bind(id, user.sub).first();
  if (!token) return c.json({ success: false, error: 'Token not found' }, 404);
  if (token.status !== 'active') return c.json({ success: false, error: 'Only active tokens can be retired' }, 400);

  const now = nowISO();
  const provenance = JSON.parse(token.provenance_chain as string);
  provenance.push({ action: 'retired', by: user.sub, at: now });

  await c.env.DB.prepare(
    "UPDATE tokenised_assets SET status = 'burned', provenance_chain = ?, retired_at = ? WHERE id = ?"
  ).bind(JSON.stringify(provenance), now, id).run();

  return c.json({ success: true, message: 'Token permanently retired' });
});

// GET /tokens — List my tokens
tokens.get('/', async (c) => {
  const user = c.get('user');
  const results = await c.env.DB.prepare(
    'SELECT * FROM tokenised_assets WHERE owner_id = ? ORDER BY minted_at DESC'
  ).bind(user.sub).all();
  return c.json({ success: true, data: results.results });
});

export default tokens;
