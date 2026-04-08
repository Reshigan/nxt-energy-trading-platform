import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';

const tenants = new Hono<HonoEnv>();

// POST /tenants — Create tenant (admin only)
tenants.post('/', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const body = await c.req.json() as {
      name: string;
      subdomain: string;
      industry?: string;
      primary_color?: string;
      secondary_color?: string;
      admin_participant_id?: string;
    };

    // Validate subdomain uniqueness
    const existing = await c.env.DB.prepare(
      'SELECT id FROM tenants WHERE subdomain = ?'
    ).bind(body.subdomain).first();
    if (existing) return c.json({ success: false, error: 'Subdomain already taken' }, 409);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO tenants (id, name, subdomain, industry, primary_color, secondary_color, admin_participant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.name, body.subdomain,
      body.industry || null,
      body.primary_color || '#d4e157',
      body.secondary_color || '#1a2e1a',
      body.admin_participant_id || null,
    ).run();

    return c.json({ success: true, data: { id, subdomain: body.subdomain, url: `https://${body.subdomain}.et.vantax.co.za` } }, 201);
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /tenants — List tenants
tenants.get('/', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM tenants ORDER BY created_at DESC'
    ).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /tenants/:id — Get tenant
tenants.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    if (!tenant) return c.json({ success: false, error: 'Tenant not found' }, 404);
    return c.json({ success: true, data: tenant });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /tenants/resolve/:subdomain — Resolve tenant by subdomain
tenants.get('/resolve/:subdomain', async (c) => {
  try {
    const subdomain = c.req.param('subdomain');
    const tenant = await c.env.DB.prepare(
      'SELECT id, name, subdomain, primary_color, secondary_color, logo_r2_key, branding FROM tenants WHERE subdomain = ? AND active = 1'
    ).bind(subdomain).first();
    if (!tenant) return c.json({ success: false, error: 'Tenant not found' }, 404);
    return c.json({
      success: true,
      data: {
        ...tenant,
        branding: tenant.branding ? JSON.parse(tenant.branding as string) : null,
      },
    });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /tenants/:id — Update tenant
tenants.patch('/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json() as {
      name?: string;
      industry?: string;
      primary_color?: string;
      secondary_color?: string;
      branding?: Record<string, unknown>;
      active?: boolean;
    };

    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { sets.push('name = ?'); values.push(body.name); }
    if (body.industry !== undefined) { sets.push('industry = ?'); values.push(body.industry); }
    if (body.primary_color !== undefined) { sets.push('primary_color = ?'); values.push(body.primary_color); }
    if (body.secondary_color !== undefined) { sets.push('secondary_color = ?'); values.push(body.secondary_color); }
    if (body.branding !== undefined) { sets.push('branding = ?'); values.push(JSON.stringify(body.branding)); }
    if (body.active !== undefined) { sets.push('active = ?'); values.push(body.active ? 1 : 0); }

    if (sets.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400);

    sets.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /tenants/:id/logo — Upload logo to R2
tenants.post('/:id/logo', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const id = c.req.param('id');
    const formData = await c.req.formData();
    const file = formData.get('logo') as File | null;
    if (!file) return c.json({ success: false, error: 'No logo file provided' }, 400);

    const r2Key = `tenants/${id}/logo-${Date.now()}`;
    const buffer = await file.arrayBuffer();
    await c.env.R2.put(r2Key, buffer, { httpMetadata: { contentType: file.type } });

    await c.env.DB.prepare(
      'UPDATE tenants SET logo_r2_key = ?, updated_at = ? WHERE id = ?'
    ).bind(r2Key, nowISO(), id).run();

    return c.json({ success: true, data: { r2_key: r2Key } });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /tenants/:id — Deactivate tenant
tenants.delete('/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE tenants SET active = 0, updated_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default tenants;
