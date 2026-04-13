/**
 * 3.4 AI Contract Negotiation — Workers AI-powered contract analysis and negotiation
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const negotiate = new Hono<HonoEnv>();
negotiate.use('*', authMiddleware());

// POST /ai/negotiate — AI analysis of contract terms
negotiate.post('/negotiate', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      contract_id?: string;
      terms: {
        ppa_tariff_cents?: number;
        escalation_pct?: number;
        tenure_years?: number;
        capacity_mw?: number;
        penalty_pct?: number;
        governing_law?: string;
      };
      counterparty_terms?: {
        ppa_tariff_cents?: number;
        escalation_pct?: number;
        tenure_years?: number;
      };
      context?: string;
    }>();

    const systemPrompt = `You are an expert South African energy contract negotiation advisor. You specialize in PPAs, wheeling agreements, and carbon credit contracts under SA law (Electricity Regulation Act, NERSA rules, Carbon Tax Act).

Analyze these contract terms and provide:
1. A risk assessment (high/medium/low) for each term
2. Suggested counter-proposals with justification
3. SA market benchmarks for comparison
4. Key regulatory considerations (NERSA, FSCA, BBBEE)
5. A recommended negotiation strategy

Proposed terms: ${JSON.stringify(body.terms)}
${body.counterparty_terms ? `Counterparty position: ${JSON.stringify(body.counterparty_terms)}` : ''}
${body.context ? `Additional context: ${body.context}` : ''}
User role: ${user.role}, Company: ${user.company_name}

Respond in structured JSON format with fields: risk_assessment, counter_proposals, market_benchmarks, regulatory_notes, strategy.`;

    let aiResponse: string;
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0], {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analyze these terms and provide negotiation guidance.' },
        ],
        max_tokens: 1024,
      });
      aiResponse = (response as { response: string }).response;
    } catch {
      // Fallback analysis if AI unavailable
      const tariff = body.terms.ppa_tariff_cents || 0;
      const escalation = body.terms.escalation_pct || 0;
      aiResponse = JSON.stringify({
        risk_assessment: {
          ppa_tariff: tariff > 200 ? 'high' : tariff > 140 ? 'medium' : 'low',
          escalation: escalation > 10 ? 'high' : escalation > 7 ? 'medium' : 'low',
          tenure: (body.terms.tenure_years || 0) > 25 ? 'medium' : 'low',
        },
        counter_proposals: [
          { term: 'ppa_tariff_cents', suggested: Math.round(tariff * 0.9), reason: 'SA market PPA rates trending lower due to increased RE capacity' },
          { term: 'escalation_pct', suggested: Math.min(escalation, 8), reason: 'Align with CPI+2% cap common in SA PPAs' },
        ],
        market_benchmarks: {
          solar_ppa_range_cents: '120-160',
          wind_ppa_range_cents: '110-150',
          typical_escalation_pct: '6-8',
          typical_tenure_years: '15-25',
        },
        regulatory_notes: [
          'NERSA licence required for generation >1MW',
          'BBBEE ownership requirements apply to IPP projects',
          'Carbon Tax Act s12L deductions available for qualifying projects',
          'Wheeling charges subject to municipal tariff structures',
        ],
        strategy: 'Start with a 10% below-market offer, emphasize long-term volume commitment as leverage. Focus on escalation cap as key negotiation point.',
      });
    }

    // Parse response
    let parsed: Record<string, unknown>;
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: aiResponse };
    } catch {
      parsed = { raw_response: aiResponse };
    }

    // Store analysis
    const analysisId = generateId();
    try {
      await c.env.DB.prepare(
        `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES (?, ?, 'ai_negotiation', 'contract', ?, ?, ?, datetime('now'))`
      ).bind(
        analysisId, user.sub, body.contract_id || 'new',
        JSON.stringify({ terms: body.terms, analysis_summary: Object.keys(parsed) }),
        c.req.header('CF-Connecting-IP') || 'unknown'
      ).run();
    } catch { /* non-critical */ }

    return c.json({
      success: true,
      data: {
        id: analysisId,
        analysis: parsed,
        input_terms: body.terms,
        counterparty_terms: body.counterparty_terms || null,
        generated_at: nowISO(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Negotiation analysis failed'), 500);
  }
});

// POST /ai/negotiate/compare — Compare two term sheets
negotiate.post('/negotiate/compare', async (c) => {
  try {
    const body = await c.req.json<{
      our_terms: Record<string, number | string>;
      their_terms: Record<string, number | string>;
    }>();

    const comparison = Object.keys({ ...body.our_terms, ...body.their_terms }).map(key => {
      const ours = body.our_terms[key];
      const theirs = body.their_terms[key];
      let gap: string | number = 'N/A';
      if (typeof ours === 'number' && typeof theirs === 'number') {
        gap = theirs - ours;
      }
      return { term: key, our_position: ours || 'Not specified', their_position: theirs || 'Not specified', gap };
    });

    return c.json({ success: true, data: { comparison, total_terms: comparison.length } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Comparison failed'), 500);
  }
});

export default negotiate;
