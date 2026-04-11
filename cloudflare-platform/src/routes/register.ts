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

// ── Item 3: Two-phase registration with OTP verification ────
// Helper: generate 6-digit OTP using crypto
function generateOTP(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, '0');
}

// Phase A: POST /register — Create participant, send OTP, return NO JWT
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
      sa_id_number, bbbee_level, nersa_licence, fsca_licence, kyc_status, trading_enabled, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0)
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

  // Generate OTP and store in KV (600s TTL)
  const otp = generateOTP();
  await c.env.KV.put(`otp:register:${data.email}`, JSON.stringify({ otp, participant_id: id }), { expirationTtl: 600 });

  // Send OTP email (best-effort via Resend if configured)
  const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined;
  if (resendKey) {
    c.executionCtx.waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NXT Energy <noreply@et.vantax.co.za>',
        to: [data.email],
        subject: 'NXT Energy — Verify your email',
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      }),
    }).catch(() => {}));
  }

  // Audit log
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'register', 'participant', ?, ?, ?)
  `).bind(
    generateId(), id, id,
    JSON.stringify({ company_name: data.company_name, role: data.role }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  // B3: Fire cascade for registration (participant.registered, NOT kyc.approved)
  c.executionCtx.waitUntil(cascade(c.env, {
    type: 'participant.registered',
    actor_id: id,
    entity_type: 'participant',
    entity_id: id,
    data: { participant_id: id, company_name: data.company_name, role: data.role },
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    request_id: c.get('requestId'),
  }));

  // Item 3: No JWT issued until OTP verified
  return c.json({
    success: true,
    data: {
      id,
      kyc_status: 'pending',
      message: 'Registration successful. Please verify your email with the OTP sent to your inbox.',
      email_verification_required: true,
    },
  }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Phase B: POST /register/verify-otp — Verify email OTP, issue JWT
register.post('/verify-otp', async (c) => {
  try {
    const body = await c.req.json() as { email: string; otp: string };
    if (!body.email || !body.otp) {
      return c.json({ success: false, error: 'Email and OTP are required' }, 400);
    }

    // Rate limit: 5 attempts per 10 min
    const rateLimitKey = `otp_attempts:${body.email}`;
    const attemptsStr = await c.env.KV.get(rateLimitKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= 5) {
      return c.json({ success: false, error: 'Too many OTP attempts. Please request a new code.' }, 429);
    }
    await c.env.KV.put(rateLimitKey, String(attempts + 1), { expirationTtl: 600 });

    // Verify OTP
    const storedStr = await c.env.KV.get(`otp:register:${body.email}`);
    if (!storedStr) {
      return c.json({ success: false, error: 'OTP expired or not found. Please request a new code.' }, 400);
    }
    const stored = JSON.parse(storedStr) as { otp: string; participant_id: string };
    if (stored.otp !== body.otp) {
      return c.json({ success: false, error: 'Invalid OTP' }, 400);
    }

    // Mark email as verified
    await c.env.DB.prepare(
      "UPDATE participants SET email_verified = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(stored.participant_id).run();

    // Clean up OTP
    await c.env.KV.delete(`otp:register:${body.email}`);
    await c.env.KV.delete(rateLimitKey);

    // Fetch participant and issue JWT
    const participant = await c.env.DB.prepare(
      'SELECT id, email, role, company_name, kyc_status FROM participants WHERE id = ?'
    ).bind(stored.participant_id).first<{ id: string; email: string; role: string; company_name: string; kyc_status: string }>();
    if (!participant) {
      return c.json({ success: false, error: 'Participant not found' }, 404);
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

    return c.json({
      success: true,
      data: { token, refreshToken, participant_id: participant.id, message: 'Email verified successfully.' },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Phase C: POST /register/resend-otp — Resend OTP with rate limit
register.post('/resend-otp', async (c) => {
  try {
    const body = await c.req.json() as { email: string };
    if (!body.email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    // Rate limit: 3 resends per 10 min
    const rateLimitKey = `otp_resend:${body.email}`;
    const resendsStr = await c.env.KV.get(rateLimitKey);
    const resends = resendsStr ? parseInt(resendsStr, 10) : 0;
    if (resends >= 3) {
      return c.json({ success: false, error: 'Too many resend requests. Please wait before trying again.' }, 429);
    }
    await c.env.KV.put(rateLimitKey, String(resends + 1), { expirationTtl: 600 });

    // Verify participant exists and is not yet verified
    const participant = await c.env.DB.prepare(
      'SELECT id, email_verified FROM participants WHERE email = ?'
    ).bind(body.email).first<{ id: string; email_verified: number }>();
    if (!participant) {
      // Don't reveal whether email exists
      return c.json({ success: true, message: 'If the email is registered, a new OTP has been sent.' });
    }
    if (participant.email_verified === 1) {
      return c.json({ success: false, error: 'Email already verified' }, 400);
    }

    // Generate new OTP
    const otp = generateOTP();
    await c.env.KV.put(`otp:register:${body.email}`, JSON.stringify({ otp, participant_id: participant.id }), { expirationTtl: 600 });

    // Send OTP email
    const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined;
    if (resendKey) {
      c.executionCtx.waitUntil(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NXT Energy <noreply@et.vantax.co.za>',
          to: [body.email],
          subject: 'NXT Energy — New verification code',
          html: `<p>Your new verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
        }),
      }).catch(() => {}));
    }

    return c.json({ success: true, message: 'If the email is registered, a new OTP has been sent.' });
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

// GET /me — Get current user profile
register.get('/me', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    const participant = await c.env.DB.prepare(
      'SELECT id, email, role, company_name, contact_person, phone, physical_address, kyc_status, trading_enabled, created_at FROM participants WHERE id = ?'
    ).bind(user.sub).first();
    if (!participant) {
      return c.json({ success: false, error: 'Participant not found' }, 404);
    }
    return c.json({ success: true, data: participant });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PATCH /me — Update current user profile
register.patch('/me', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as Record<string, unknown>;

    const allowedFields = ['company_name', 'contact_person', 'phone', 'physical_address', 'email', 'name'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = field === 'name' ? 'contact_person' : field;
        updates.push(`${dbField} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(nowISO());
    values.push(user.sub);

    await c.env.DB.prepare(
      `UPDATE participants SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Audit log
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'update_profile', 'participant', ?, ?, ?)`
    ).bind(generateId(), user.sub, user.sub, JSON.stringify(body), c.req.header('CF-Connecting-IP') || 'unknown').run();

    return c.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /me/password — Change current user password
register.post('/me/password', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { current_password: string; new_password: string };

    if (!body.current_password || !body.new_password) {
      return c.json({ success: false, error: 'Current password and new password are required' }, 400);
    }

    if (body.new_password.length < 8) {
      return c.json({ success: false, error: 'New password must be at least 8 characters' }, 400);
    }

    const participant = await c.env.DB.prepare(
      'SELECT password_hash, password_salt FROM participants WHERE id = ?'
    ).bind(user.sub).first<{ password_hash: string; password_salt: string }>();

    if (!participant) {
      return c.json({ success: false, error: 'Participant not found' }, 404);
    }

    const valid = await verifyPassword(body.current_password, participant.password_hash, participant.password_salt);
    if (!valid) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 401);
    }

    const { hash, salt } = await hashPassword(body.new_password);
    await c.env.DB.prepare(
      'UPDATE participants SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?'
    ).bind(hash, salt, nowISO(), user.sub).run();

    // Audit log
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'change_password', 'participant', ?, '{}', ?)`
    ).bind(generateId(), user.sub, user.sub, c.req.header('CF-Connecting-IP') || 'unknown').run();

    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ---- Auth endpoints ----

// POST /auth/login — Item 9: brute-force protection + Item 8: 2FA check
register.post('/auth/login', async (c) => {
  try {
  const body = await c.req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid credentials' }, 400);
  }

  const { email, password } = parsed.data;

  // Item 9: Brute-force protection — 5 attempts per 15 min per email
  const failKey = `login_fail:${email}`;
  const failStr = await c.env.KV.get(failKey);
  const failCount = failStr ? parseInt(failStr, 10) : 0;
  if (failCount >= 5) {
    return c.json({ success: false, error: 'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.' }, 429);
  }

  const participant = await c.env.DB.prepare(
    'SELECT id, email, role, company_name, kyc_status, password_hash, password_salt, trading_enabled, two_factor_enabled FROM participants WHERE email = ?'
  ).bind(email).first<{
    id: string; email: string; role: string; company_name: string;
    kyc_status: string; password_hash: string; password_salt: string;
    trading_enabled: number; two_factor_enabled: number;
  }>();

  if (!participant) {
    await c.env.KV.put(failKey, String(failCount + 1), { expirationTtl: 900 });
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, participant.password_hash, participant.password_salt);
  if (!valid) {
    await c.env.KV.put(failKey, String(failCount + 1), { expirationTtl: 900 });
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  // Successful password — clear brute-force counter
  await c.env.KV.delete(failKey);

  if (participant.kyc_status === 'suspended') {
    return c.json({ success: false, error: 'Account suspended' }, 403);
  }
  if (participant.kyc_status === 'deleted') {
    return c.json({ success: false, error: 'Account has been deactivated' }, 403);
  }

  // Item 8: 2FA check — if enabled, return temporary token instead of full JWT
  if (participant.two_factor_enabled === 1) {
    // Generate a temporary token (5 min TTL) and OTP
    const tempToken = crypto.randomUUID();
    const otp = generateOTP();
    await c.env.KV.put(`2fa_temp:${tempToken}`, JSON.stringify({ participant_id: participant.id, email: participant.email }), { expirationTtl: 300 });
    await c.env.KV.put(`2fa_otp:${participant.id}`, otp, { expirationTtl: 300 });

    // Send 2FA OTP email
    const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined;
    if (resendKey) {
      c.executionCtx.waitUntil(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NXT Energy <noreply@et.vantax.co.za>',
          to: [participant.email],
          subject: 'NXT Energy — 2FA Login Code',
          html: `<p>Your 2FA login code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
        }),
      }).catch(() => {}));
    }

    return c.json({
      success: true,
      data: {
        requires_2fa: true,
        temp_token: tempToken,
        message: 'Two-factor authentication required. Check your email for the code.',
      },
    });
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

  // Audit — store token so session revocation can blacklist it
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'login', 'participant', ?, ?, ?)
  `).bind(
    generateId(), participant.id, participant.id,
    JSON.stringify({ token, user_agent: c.req.header('User-Agent') || 'Unknown' }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

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

// Item 8: POST /auth/login/2fa — Exchange temp token + OTP for real JWT
register.post('/auth/login/2fa', async (c) => {
  try {
    const body = await c.req.json() as { temp_token: string; otp: string };
    if (!body.temp_token || !body.otp) {
      return c.json({ success: false, error: 'temp_token and otp are required' }, 400);
    }

    // Validate temp token
    const tempStr = await c.env.KV.get(`2fa_temp:${body.temp_token}`);
    if (!tempStr) {
      return c.json({ success: false, error: 'Temporary token expired or invalid' }, 401);
    }
    const tempData = JSON.parse(tempStr) as { participant_id: string; email: string };

    // Validate OTP
    const storedOtp = await c.env.KV.get(`2fa_otp:${tempData.participant_id}`);
    if (!storedOtp || storedOtp !== body.otp) {
      return c.json({ success: false, error: 'Invalid 2FA code' }, 401);
    }

    // Clean up
    await c.env.KV.delete(`2fa_temp:${body.temp_token}`);
    await c.env.KV.delete(`2fa_otp:${tempData.participant_id}`);

    // Fetch participant and issue JWT
    const participant = await c.env.DB.prepare(
      'SELECT id, email, role, company_name, kyc_status, trading_enabled FROM participants WHERE id = ?'
    ).bind(tempData.participant_id).first<{
      id: string; email: string; role: string; company_name: string;
      kyc_status: string; trading_enabled: number;
    }>();
    if (!participant) {
      return c.json({ success: false, error: 'Participant not found' }, 404);
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
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'login_2fa', 'participant', ?, ?, ?)
    `).bind(
      generateId(), participant.id, participant.id,
      JSON.stringify({ token, user_agent: c.req.header('User-Agent') || 'Unknown' }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

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

// Item 7: POST /auth/forgot-password — Generate OTP, send email, 3/hour rate limit
register.post('/auth/forgot-password', async (c) => {
  try {
    const body = await c.req.json() as { email: string };
    if (!body.email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    // Rate limit: 3 requests per hour
    const rateLimitKey = `forgot_pw:${body.email}`;
    const countStr = await c.env.KV.get(rateLimitKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= 3) {
      return c.json({ success: false, error: 'Too many password reset requests. Try again later.' }, 429);
    }
    await c.env.KV.put(rateLimitKey, String(count + 1), { expirationTtl: 3600 });

    // Always return success (don't reveal if email exists)
    const participant = await c.env.DB.prepare(
      'SELECT id, email FROM participants WHERE email = ?'
    ).bind(body.email).first<{ id: string; email: string }>();

    if (participant) {
      const otp = generateOTP();
      await c.env.KV.put(`otp:reset:${body.email}`, JSON.stringify({ otp, participant_id: participant.id }), { expirationTtl: 600 });

      const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined;
      if (resendKey) {
        c.executionCtx.waitUntil(fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'NXT Energy <noreply@et.vantax.co.za>',
            to: [body.email],
            subject: 'NXT Energy — Password Reset Code',
            html: `<p>Your password reset code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>`,
          }),
        }).catch(() => {}));
      }
    }

    return c.json({ success: true, message: 'If the email is registered, a password reset code has been sent.' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Item 7: POST /auth/reset-password — Verify OTP, set new password, blacklist old tokens
register.post('/auth/reset-password', async (c) => {
  try {
    const body = await c.req.json() as { email: string; otp: string; new_password: string };
    if (!body.email || !body.otp || !body.new_password) {
      return c.json({ success: false, error: 'Email, OTP, and new password are required' }, 400);
    }

    // Validate password strength (Item 11 policy)
    if (body.new_password.length < 8 || body.new_password.length > 128) {
      return c.json({ success: false, error: 'Password must be between 8 and 128 characters' }, 400);
    }
    if (!/[A-Z]/.test(body.new_password) || !/[a-z]/.test(body.new_password) || !/[0-9]/.test(body.new_password) || !/[^A-Za-z0-9]/.test(body.new_password)) {
      return c.json({ success: false, error: 'Password must contain uppercase, lowercase, number, and special character' }, 400);
    }

    // Verify OTP
    const storedStr = await c.env.KV.get(`otp:reset:${body.email}`);
    if (!storedStr) {
      return c.json({ success: false, error: 'OTP expired or not found' }, 400);
    }
    const stored = JSON.parse(storedStr) as { otp: string; participant_id: string };
    if (stored.otp !== body.otp) {
      return c.json({ success: false, error: 'Invalid OTP' }, 400);
    }

    // Update password
    const { hash, salt } = await hashPassword(body.new_password);
    await c.env.DB.prepare(
      "UPDATE participants SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(hash, salt, stored.participant_id).run();

    // Clean up OTP
    await c.env.KV.delete(`otp:reset:${body.email}`);

    // Blacklist all existing tokens for this user (force re-login)
    await c.env.KV.put(`token_blacklist:${stored.participant_id}`, nowISO(), { expirationTtl: 86400 });

    // Audit
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'password_reset', 'participant', ?, '{}', ?)`
    ).bind(generateId(), stored.participant_id, stored.participant_id, c.req.header('CF-Connecting-IP') || 'unknown').run();

    return c.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ── POPIA Data Export ─────────────────────────────────────────
register.get('/me/export', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;

    const [participant, trades, orders, credits, contracts, invoices, notifications, auditLog] = await Promise.all([
      c.env.DB.prepare('SELECT id, email, role, company_name, contact_person, phone, physical_address, kyc_status, created_at FROM participants WHERE id = ?').bind(pid).first(),
      c.env.DB.prepare('SELECT id, market, direction, volume_mwh, price_cents, total_cents, status, created_at FROM trades WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC').bind(pid, pid).all(),
      c.env.DB.prepare('SELECT id, market, direction, order_type, volume_mwh, price_cents, status, created_at FROM orders WHERE participant_id = ? ORDER BY created_at DESC').bind(pid).all(),
      c.env.DB.prepare('SELECT id, amount_tonnes, standard, status, created_at FROM carbon_credits WHERE owner_id = ? ORDER BY created_at DESC').bind(pid).all(),
      c.env.DB.prepare("SELECT cd.id, cd.title, cd.doc_type, cd.phase, cd.created_at FROM contract_documents cd JOIN document_signatories ds ON cd.id = ds.document_id WHERE ds.participant_id = ? ORDER BY cd.created_at DESC").bind(pid).all(),
      c.env.DB.prepare('SELECT id, invoice_number, total_cents, status, due_date, created_at FROM invoices WHERE from_participant_id = ? OR to_participant_id = ? ORDER BY created_at DESC').bind(pid, pid).all(),
      c.env.DB.prepare('SELECT id, title, body, type, created_at FROM notifications WHERE participant_id = ? ORDER BY created_at DESC LIMIT 100').bind(pid).all(),
      c.env.DB.prepare("SELECT id, action, entity_type, entity_id, created_at FROM audit_log WHERE actor_id = ? ORDER BY created_at DESC LIMIT 200").bind(pid).all(),
    ]);

    return c.json({
      success: true,
      data: {
        export_date: nowISO(),
        format: 'POPIA_COMPLIANT_EXPORT',
        participant,
        trades: trades.results,
        orders: orders.results,
        carbon_credits: credits.results,
        contracts: contracts.results,
        invoices: invoices.results,
        notifications: notifications.results,
        audit_log: auditLog.results,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

// ── Account Deletion Request ─────────────────────────────────
register.post('/me/delete-request', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({})) as { reason?: string };

    // Check for existing pending request
    const existing = await c.env.DB.prepare(
      "SELECT id FROM deletion_requests WHERE participant_id = ? AND status = 'pending'"
    ).bind(user.sub).first();
    if (existing) {
      return c.json({ success: false, error: 'A deletion request is already pending' }, 409);
    }

    const id = generateId();
    const processAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await c.env.DB.prepare(
      'INSERT INTO deletion_requests (id, participant_id, reason, status, requested_at, process_after) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.reason || null, 'pending', nowISO(), processAfter).run();

    // Audit log
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, 'deletion_request', 'participant', ?, ?, ?)`
    ).bind(generateId(), user.sub, user.sub, JSON.stringify({ reason: body.reason }), c.req.header('CF-Connecting-IP') || 'unknown').run();

    return c.json({
      success: true,
      data: {
        id,
        process_after: processAfter,
        message: 'Your account deletion request has been submitted. It will be processed after a 30-day cooling-off period. You may cancel this request at any time.',
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to submit deletion request' }, 500);
  }
});

// Cancel deletion request
register.post('/me/cancel-deletion', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare(
      "UPDATE deletion_requests SET status = 'cancelled' WHERE participant_id = ? AND status = 'pending'"
    ).bind(user.sub).run();
    return c.json({ success: true, message: 'Deletion request cancelled' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to cancel deletion request' }, 500);
  }
});

// ── Notification Preferences ─────────────────────────────────
register.get('/me/preferences', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    let prefs = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE participant_id = ?'
    ).bind(user.sub).first();

    if (!prefs) {
      // Return defaults
      prefs = {
        email_trade_confirmations: 1,
        email_contract_signatures: 1,
        email_cp_deadlines: 1,
        email_invoice_generated: 1,
        email_monthly_summary: 1,
        push_trade_executions: 1,
        push_price_alerts: 1,
        push_cp_deadlines: 1,
      };
    }

    return c.json({ success: true, data: prefs });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to load preferences' }, 500);
  }
});

register.post('/me/preferences', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as Record<string, unknown>;

    const allowedKeys = [
      'email_trade_confirmations', 'email_contract_signatures', 'email_cp_deadlines',
      'email_invoice_generated', 'email_monthly_summary',
      'push_trade_executions', 'push_price_alerts', 'push_cp_deadlines',
    ];

    const existing = await c.env.DB.prepare(
      'SELECT id FROM notification_preferences WHERE participant_id = ?'
    ).bind(user.sub).first();

    if (existing) {
      const updates: string[] = [];
      const values: unknown[] = [];
      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(body[key] ? 1 : 0);
        }
      }
      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(nowISO());
        values.push(user.sub);
        await c.env.DB.prepare(
          `UPDATE notification_preferences SET ${updates.join(', ')} WHERE participant_id = ?`
        ).bind(...values).run();
      }
    } else {
      const id = generateId();
      const vals: Record<string, number> = {};
      for (const key of allowedKeys) {
        vals[key] = body[key] !== undefined ? (body[key] ? 1 : 0) : 1;
      }
      await c.env.DB.prepare(
        `INSERT INTO notification_preferences (id, participant_id, email_trade_confirmations, email_contract_signatures, email_cp_deadlines, email_invoice_generated, email_monthly_summary, push_trade_executions, push_price_alerts, push_cp_deadlines, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, user.sub,
        vals.email_trade_confirmations, vals.email_contract_signatures, vals.email_cp_deadlines,
        vals.email_invoice_generated, vals.email_monthly_summary,
        vals.push_trade_executions, vals.push_price_alerts, vals.push_cp_deadlines,
        nowISO()
      ).run();
    }

    return c.json({ success: true, message: 'Preferences updated' });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to update preferences' }, 500);
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
