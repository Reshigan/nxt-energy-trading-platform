/**
 * 4.4 Platform-Wide Search — Unified search across all entity types
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const search = new Hono<HonoEnv>();
search.use('*', authMiddleware());

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  relevance: number;
}

// GET /search?q=... — Unified platform search
search.get('/', async (c) => {
  try {
    const q = c.req.query('q') || '';
    if (q.length < 2) return c.json({ success: true, data: [] });

    const user = c.get('user');
    const searchTerm = `%${q}%`;
    const limit = Math.min(50, parseInt(c.req.query('limit') || '20', 10));
    const results: SearchResult[] = [];

    // Search participants
    const participants = await c.env.DB.prepare(
      'SELECT id, company_name, email, role FROM participants WHERE company_name LIKE ? OR email LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm).all();
    for (const p of participants.results) {
      results.push({
        type: 'participant', id: p.id as string,
        title: p.company_name as string, subtitle: `${p.role} • ${p.email}`,
        url: `/participants/${p.id}`, relevance: 90,
      });
    }

    // Search trades
    const trades = await c.env.DB.prepare(
      'SELECT t.id, t.market, t.volume, t.status, t.created_at FROM trades t WHERE t.id LIKE ? OR t.market LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm).all();
    for (const t of trades.results) {
      results.push({
        type: 'trade', id: t.id as string,
        title: `${t.market} Trade`, subtitle: `${t.volume} MWh • ${t.status}`,
        url: `/trading`, relevance: 80,
      });
    }

    // Search contracts
    const contracts = await c.env.DB.prepare(
      'SELECT id, document_type, counterparty_name, phase FROM contract_documents WHERE counterparty_name LIKE ? OR document_type LIKE ? OR id LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm, searchTerm).all();
    for (const co of contracts.results) {
      results.push({
        type: 'contract', id: co.id as string,
        title: `${co.document_type} Contract`, subtitle: `${co.counterparty_name || 'N/A'} • ${co.phase}`,
        url: `/contracts/${co.id}`, relevance: 85,
      });
    }

    // Search carbon credits
    const credits = await c.env.DB.prepare(
      'SELECT id, standard, project_name, vintage_year FROM carbon_credits WHERE project_name LIKE ? OR standard LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm).all();
    for (const cr of credits.results) {
      results.push({
        type: 'carbon_credit', id: cr.id as string,
        title: (cr.project_name as string) || 'Carbon Credit', subtitle: `${cr.standard} • Vintage ${cr.vintage_year}`,
        url: `/carbon/${cr.id}`, relevance: 75,
      });
    }

    // Search projects
    const projects = await c.env.DB.prepare(
      'SELECT id, name, technology, province FROM projects WHERE name LIKE ? OR technology LIKE ? OR province LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm, searchTerm).all();
    for (const pr of projects.results) {
      results.push({
        type: 'project', id: pr.id as string,
        title: pr.name as string, subtitle: `${pr.technology} • ${pr.province || 'SA'}`,
        url: `/ipp/${pr.id}`, relevance: 70,
      });
    }

    // Search invoices
    const invoices = await c.env.DB.prepare(
      'SELECT id, counterparty, status, total_cents FROM invoices WHERE counterparty LIKE ? OR id LIKE ? LIMIT 5'
    ).bind(searchTerm, searchTerm).all();
    for (const inv of invoices.results) {
      results.push({
        type: 'invoice', id: inv.id as string,
        title: `Invoice #${(inv.id as string).substring(0, 8)}`, subtitle: `${inv.counterparty || 'N/A'} • R${((inv.total_cents as number || 0) / 100).toFixed(2)}`,
        url: `/settlement`, relevance: 65,
      });
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return c.json({ success: true, data: results.slice(0, limit), meta: { query: q, total: results.length } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Search failed'), 500);
  }
});

export default search;
