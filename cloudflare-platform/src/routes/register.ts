import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { hashPassword, verifyPassword } from '../utils/hash';
import { RegisterSchema, LoginSchema } from '../utils/validation';
import { signJwt, signRefreshToken } from '../auth/jwt';
import { authMiddleware } from '../auth/middleware';
import { cascade } from '../utils/cascade';
import { captureException } from '../utils/sentry';

const register = new Hono<HonoEnv>();

// POST /register — Self-registration
register.post('/', async (c) => {
  try {
  const body = await c.req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;

  // Check for duplicate email
  const existing = await c.env.DB.prepare('SELECT id FROM participants WHERE email = ?').bind(data.email).first();
  if (existing) {
    return c.json({ success: false, error: 'Email already registered' }, 409);
  }

  // Check for duplicate registration number
  const existingReg = await c.env.DB.prepare('SELECT id FROM participants WHERE registration_number = ?').bind(data.registration_number).first();
  if (existingReg) {
    return c.json({ success: false, error: 'Registration number already exists' }, 409);
  }

  const id = generateId();
  const { hash, salt } = await hashPassword(data.password);

  await c.env.DB.prepare(`
    INSERT INTO participants (id, company_name, registration_number, tax_number, vat_number, role,
      contact_person, email, password_hash, password_salt, phone, physical_address,
      sa_id_number, bbbee_level, nersa_licence, fsca_licence, kyc_status, trading_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
  `).bind(
    id, data.company_name, data.registration_number, data.tax_number,
    data.vat_number || null, data.role, data.contact_person, data.email,
    hash, salt, data.phone, data.physical_address,
    data.sa_id_number || null, data.bbbee_level || null,
    data.nersa_licence || null, data.fsca_licence || null
  ).run();

  // Trigger auto-validation pipeline
  const regulations = getRequiredRegulations(data.role);
  for (const reg of regulations) {
    const checkId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO statutory_checks (id, entity_type, entity_id, regulation, status, method)
      VALUES (?, 'participant', ?, ?, 'pending', ?)
    `).bind(checkId, id, reg.name, reg.method).run();
  }

  // Run auto-validations asynchronously (simulate pipeline)
  await runAutoValidations(id, data, c.env.DB);

  // Generate JWT
  const jwtSecret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;
  const token = await signJwt({
    sub: id,
    email: data.email,
    role: data.role as any,
    company_name: data.company_name,
    kyc_status: 'pending',
  }, jwtSecret);
  const refreshToken = await signRefreshToken(id, jwtSecret);

  // Audit log
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'register', 'participant', ?, ?, ?)
  `).bind(
    generateId(), id, id,
    JSON.stringify({ company_name: data.company_name, role: data.role }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  // B3: Fire cascade for registration
  c.executionCtx.waitUntil(cascade(c.env, {
    type: 'kyc.approved',
    actor_id: id,
    entity_type: 'participant',
    entity_id: id,
    data: { participant_id: id, company_name: data.company_name, role: data.role },
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    request_id: c.get('requestId'),
  }));

  return c.json({
    success: true,
    data: {
      id,
      token,
      refreshToken,
      kyc_status: 'pending',
      message: 'Registration successful. Auto-validation pipeline triggered.',
    },
  }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /register/status/:id — Check registration status
register.get('/status/:id', authMiddleware({ requireKyc: false }), async (c) => {
  try {
  const { id } = c.req.param();
  const user = c.get('user');

  // Users can only check their own status (admins can check any)
  if (user.sub !== id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  const participant = await c.env.DB.prepare(`
    SELECT id, company_name, registration_number, role, kyc_status, trading_enabled, created_at
    FROM participants WHERE id = ?
  `).bind(id).first();

  if (!participant) {
    return c.json({ success: false, error: 'Participant not found' }, 404);
  }

  const checks = await c.env.DB.prepare(`
    SELECT regulation, status, method, source, reason, checked_at
    FROM statutory_checks WHERE entity_type = 'participant' AND entity_id = ?
    ORDER BY created_at
  `).bind(id).all();

  return c.json({
    success: true,
    data: {
      participant,
      statutory_checks: checks.results,
    },
  });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /register/:id/documents — Upload KYC documents
register.post('/:id/documents', authMiddleware({ requireKyc: false }), async (c) => {
  try {
  const { id } = c.req.param();
  const user = c.get('user');

  if (user.sub !== id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const documentType = formData.get('document_type') as string;

  if (!file || !documentType) {
    return c.json({ success: false, error: 'File and document_type required' }, 400);
  }

  const r2Key = `kyc/${id}/${documentType}/${Date.now()}_${file.name}`;
  await c.env.R2.put(r2Key, await file.arrayBuffer(), {
    customMetadata: {
      participantId: id,
      documentType,
      originalName: file.name,
    },
  });

  const docId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO kyc_documents (id, participant_id, document_type, r2_key, file_name, file_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(docId, id, documentType, r2Key, file.name, file.size, file.type).run();

  // Audit log
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'upload_kyc_document', 'kyc_document', ?, ?, ?)
  `).bind(
    generateId(), user.sub, docId,
    JSON.stringify({ document_type: documentType, file_name: file.name }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({
    success: true,
    data: { id: docId, document_type: documentType, file_name: file.name },
  }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /register/:id/validate — Manually trigger re-validation
register.post('/:id/validate', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
  const { id } = c.req.param();

  const participant = await c.env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first();
  if (!participant) {
    return c.json({ success: false, error: 'Participant not found' }, 404);
  }

  // Reset all pending/fail checks to pending and re-run
  await c.env.DB.prepare(`
    UPDATE statutory_checks SET status = 'pending', checked_at = NULL
    WHERE entity_type = 'participant' AND entity_id = ? AND status IN ('pending', 'fail')
  `).bind(id).run();

  await runAutoValidations(id, participant as any, c.env.DB);

  return c.json({ success: true, message: 'Re-validation triggered' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /register/:id/approve — Admin approve
register.post('/:id/approve', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { override_notes?: string };

  await c.env.DB.prepare(`
    UPDATE participants SET kyc_status = 'verified', trading_enabled = 1, updated_at = ?
    WHERE id = ?
  `).bind(nowISO(), id).run();

  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'approve_participant', 'participant', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ override_notes: body.override_notes }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  // Create notification
  await c.env.DB.prepare(`
    INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
    VALUES (?, ?, 'Registration Approved', 'Your registration has been approved. Trading is now enabled.', 'success', 'participant', ?)
  `).bind(generateId(), id, id).run();

  // B3: Fire cascade for KYC approval
  c.executionCtx.waitUntil(cascade(c.env, {
    type: 'kyc.approved',
    actor_id: user.sub,
    entity_type: 'participant',
    entity_id: id,
    data: { participant_id: id },
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    request_id: c.get('requestId'),
  }));

  return c.json({ success: true, message: 'Participant approved' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /register/:id/reject — Admin reject
register.post('/:id/reject', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as { reason: string };

  if (!body.reason) {
    return c.json({ success: false, error: 'Rejection reason required' }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE participants SET kyc_status = 'rejected', trading_enabled = 0, updated_at = ?
    WHERE id = ?
  `).bind(nowISO(), id).run();

  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'reject_participant', 'participant', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ reason: body.reason }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  await c.env.DB.prepare(`
    INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
    VALUES (?, ?, 'Registration Rejected', ?, 'danger', 'participant', ?)
  `).bind(generateId(), id, `Your registration was rejected: ${body.reason}`, id).run();

  // B3: Fire cascade for KYC rejection
  c.executionCtx.waitUntil(cascade(c.env, {
    type: 'kyc.rejected',
    actor_id: user.sub,
    entity_type: 'participant',
    entity_id: id,
    data: { participant_id: id, reason: body.reason },
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    request_id: c.get('requestId'),
  }));

  return c.json({ success: true, message: 'Participant rejected' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ---- Auth endpoints ----

// POST /auth/login
register.post('/auth/login', async (c) => {
  try {
  const body = await c.req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid credentials' }, 400);
  }

  const { email, password } = parsed.data;
  const participant = await c.env.DB.prepare(
    'SELECT id, email, role, company_name, kyc_status, password_hash, password_salt, trading_enabled FROM participants WHERE email = ?'
  ).bind(email).first<{
    id: string; email: string; role: string; company_name: string;
    kyc_status: string; password_hash: string; password_salt: string; trading_enabled: number;
  }>();

  if (!participant) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, participant.password_hash, participant.password_salt);
  if (!valid) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  if (participant.kyc_status === 'suspended') {
    return c.json({ success: false, error: 'Account suspended' }, 403);
  }

  const jwtSecret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;
  const token = await signJwt({
    sub: participant.id,
    email: participant.email,
    role: participant.role as any,
    company_name: participant.company_name,
    kyc_status: participant.kyc_status as any,
  }, jwtSecret);
  const refreshToken = await signRefreshToken(participant.id, jwtSecret);

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, ip_address)
    VALUES (?, ?, 'login', 'participant', ?, ?)
  `).bind(generateId(), participant.id, participant.id, c.req.header('CF-Connecting-IP') || 'unknown').run();

  return c.json({
    success: true,
    data: {
      token,
      refreshToken,
      participant: {
        id: participant.id,
        email: participant.email,
        role: participant.role,
        company_name: participant.company_name,
        kyc_status: participant.kyc_status,
        trading_enabled: participant.trading_enabled,
      },
    },
  });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ---- Helper functions ----

interface RegulationRequirement {
  name: string;
  method: 'auto' | 'manual';
}

function getRequiredRegulations(role: string): RegulationRequirement[] {
  const base: RegulationRequirement[] = [
    { name: 'cipc', method: 'auto' },
    { name: 'sars_tax', method: 'auto' },
    { name: 'sars_vat', method: 'auto' },
    { name: 'fica', method: 'auto' },
    { name: 'sanctions', method: 'auto' },
    { name: 'bbbee', method: 'auto' },
  ];

  if (role === 'ipp' || role === 'grid') {
    base.push({ name: 'nersa', method: 'auto' });
  }

  if (role === 'trader' || role === 'carbon_fund') {
    base.push({ name: 'fsca', method: 'auto' });
    base.push({ name: 'fais', method: 'auto' });
  }

  if (role === 'ipp') {
    base.push({ name: 'cidb', method: 'auto' });
  }

  return base;
}

async function runAutoValidations(
  participantId: string,
  data: Record<string, unknown>,
  db: D1Database
): Promise<void> {
  const checks = await db.prepare(`
    SELECT id, regulation FROM statutory_checks
    WHERE entity_type = 'participant' AND entity_id = ? AND method = 'auto' AND status = 'pending'
  `).bind(participantId).all();

  for (const check of checks.results) {
    const result = await runValidator(check.regulation as string, data);
    await db.prepare(`
      UPDATE statutory_checks SET status = ?, source = ?, reason = ?, checked_at = ?
      WHERE id = ?
    `).bind(result.status, result.source || null, result.reason || null, nowISO(), check.id).run();
  }

  // Check if all auto-checks pass — if so, move to in_review
  const allChecks = await db.prepare(`
    SELECT status FROM statutory_checks
    WHERE entity_type = 'participant' AND entity_id = ?
  `).bind(participantId).all();

  const allPassed = allChecks.results.every(
    (ch) => ch.status === 'pass' || ch.status === 'exempt' || ch.status === 'overridden'
  );

  if (allPassed) {
    await db.prepare(`
      UPDATE participants SET kyc_status = 'in_review', updated_at = ? WHERE id = ?
    `).bind(nowISO(), participantId).run();
  }
}

async function runValidator(
  regulation: string,
  data: Record<string, unknown>
): Promise<{ status: 'pass' | 'fail'; source?: string; reason?: string }> {
  // Simulate 100ms delay for each validator (in production: call external APIs)
  switch (regulation) {
    case 'cipc':
      // Validate CIPC number format
      if (data.registration_number && /^\d{4}\/\d{6}\/\d{2}$/.test(data.registration_number as string)) {
        return { status: 'pass', source: 'CIPC Registry (simulated)' };
      }
      return { status: 'fail', reason: 'Invalid CIPC registration number format' };

    case 'sars_tax':
      if (data.tax_number && /^\d{10}$/.test(data.tax_number as string)) {
        return { status: 'pass', source: 'SARS eFiling (simulated)' };
      }
      return { status: 'fail', reason: 'Invalid SARS tax number' };

    case 'sars_vat':
      if (!data.vat_number) {
        return { status: 'pass', source: 'VAT not applicable' };
      }
      if (/^4\d{9}$/.test(data.vat_number as string)) {
        return { status: 'pass', source: 'SARS VAT (simulated)' };
      }
      return { status: 'fail', reason: 'Invalid VAT number format' };

    case 'fica':
      return { status: 'pass', source: 'FICA KYC Module (simulated)' };

    case 'sanctions':
      return { status: 'pass', source: 'Sanctions Screening (simulated)' };

    case 'bbbee':
      if (data.bbbee_level && (data.bbbee_level as number) >= 1 && (data.bbbee_level as number) <= 8) {
        return { status: 'pass', source: 'CIPC/DTI BBBEE (simulated)' };
      }
      return { status: 'pass', source: 'BBBEE level not provided — deferred' };

    case 'nersa':
      if (data.nersa_licence) {
        return { status: 'pass', source: 'NERSA Registry (simulated)' };
      }
      return { status: 'fail', reason: 'No NERSA licence on file' };

    case 'fsca':
      if (data.fsca_licence) {
        return { status: 'pass', source: 'FSCA Registry (simulated)' };
      }
      return { status: 'fail', reason: 'No FSCA licence on file' };

    case 'fais':
      return { status: 'pass', source: 'FAIS Registry (simulated)' };

    case 'cidb':
      return { status: 'pass', source: 'CIDB Registry (simulated)' };

    case 'section12b':
      return { status: 'pass', source: 'SARS Section 12B (simulated)' };

    default:
      return { status: 'pass', source: `${regulation} (simulated)` };
  }
}

export default register;
