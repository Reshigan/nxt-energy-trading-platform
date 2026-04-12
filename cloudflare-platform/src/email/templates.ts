// Email template definitions — Spec 8 Section 2
// These are HTML templates for Cloudflare Email Workers
// In production, templates would be stored in R2 and rendered with MJML

/** Escape user-controlled data before interpolating into HTML to prevent injection */
function esc(str: string | number): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Ionvex Platform',
    template: (data: { name: string; company: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Welcome, ${esc(data.name)}!</h2>
          <p style="color:#475569">Your account for <strong>${esc(data.company)}</strong> has been created on the Ionvex Trading Platform.</p>
          <p style="color:#475569">Next steps:</p>
          <ol style="color:#475569">
            <li>Verify your email address</li>
            <li>Complete your quick profile</li>
            <li>Upload KYC documents to unlock trading</li>
          </ol>
          <a href="https://et.vantax.co.za" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Enter Platform</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park &bull; <a href="https://et.vantax.co.za/terms" style="color:#3b82f6">Terms</a>
        </div>
      </div>
    `,
  },

  verification: {
    subject: 'Your Ionvex verification code: {OTP}',
    template: (data: { otp: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff;text-align:center">
          <h2 style="color:#0f172a">Email Verification</h2>
          <p style="color:#475569">Enter this code to verify your email address:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f172a;padding:16px;background:#f1f5f9;border-radius:12px;display:inline-block;margin:16px 0">${esc(data.otp)}</div>
          <p style="color:#94a3b8;font-size:14px">This code expires in 10 minutes.</p>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  trade_confirmation: {
    subject: 'Trade confirmation — {trade_type} {volume} @ {price}',
    template: (data: { trade_type: string; volume: string; price: string; market: string; settlement_date: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Trade Confirmation</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Type</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.trade_type)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Volume</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.volume)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Price</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.price)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Market</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.market)}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Settlement Date</td><td style="padding:8px;font-weight:600">${esc(data.settlement_date)}</td></tr>
          </table>
          <a href="https://et.vantax.co.za/trading" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View in Platform</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  invoice_generated: {
    subject: 'Invoice {invoice_number} — {total} due {due_date}',
    template: (data: { invoice_number: string; total: string; due_date: string; seller: string; buyer: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Invoice Generated</h2>
          <p style="color:#475569">Invoice <strong>${esc(data.invoice_number)}</strong> has been generated.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">From</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.seller)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">To</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(data.buyer)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Total</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#059669">${esc(data.total)}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Due Date</td><td style="padding:8px;font-weight:600">${esc(data.due_date)}</td></tr>
          </table>
          <a href="https://et.vantax.co.za/settlement" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Invoice</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  contract_signature_required: {
    subject: 'Action required — sign {document_title}',
    template: (data: { document_title: string; requester: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Signature Required</h2>
          <p style="color:#475569"><strong>${esc(data.requester)}</strong> has requested your signature on:</p>
          <p style="font-size:18px;font-weight:600;color:#0f172a">${esc(data.document_title)}</p>
          <a href="https://et.vantax.co.za/contracts" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Sign Now</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  kyc_update: {
    subject: 'Registration update — {passed}/{total} checks passed',
    template: (data: { passed: number; total: number; checks: Array<{name: string; status: string}> }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Registration Update</h2>
          <p style="color:#475569"><strong>${esc(data.passed)}</strong> of <strong>${esc(data.total)}</strong> verification checks have passed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${data.checks.map(c => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${esc(c.name)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:${c.status === 'pass' ? '#059669' : c.status === 'fail' ? '#dc2626' : '#d97706'}">${esc(c.status).toUpperCase()}</td></tr>`).join('')}
          </table>
          <a href="https://et.vantax.co.za/register" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Continue Registration</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  cp_deadline: {
    subject: 'Action required — {cp_description} due in {days} days',
    template: (data: { cp_description: string; days: number; project_name: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">CP Deadline Approaching</h2>
          <p style="color:#475569">A condition precedent for <strong>${esc(data.project_name)}</strong> is due soon:</p>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
            <p style="font-weight:600;color:#92400e;margin:0">${esc(data.cp_description)}</p>
            <p style="color:#92400e;margin:4px 0 0;font-size:14px">Due in ${esc(data.days)} days</p>
          </div>
          <a href="https://et.vantax.co.za/ipp" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Upload Document</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  dispute_filed: {
    subject: 'Dispute {dispute_id} filed against you',
    template: (data: { dispute_id: string; reason: string; deadline: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Dispute Filed</h2>
          <p style="color:#475569">A dispute has been filed against you:</p>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
            <p style="font-weight:600;color:#991b1b;margin:0">Dispute ${esc(data.dispute_id)}</p>
            <p style="color:#991b1b;margin:4px 0 0;font-size:14px">${esc(data.reason)}</p>
          </div>
          <p style="color:#475569">Response deadline: <strong>${esc(data.deadline)}</strong></p>
          <a href="https://et.vantax.co.za/settlement" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Respond Now</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park
        </div>
      </div>
    `,
  },

  monthly_summary: {
    subject: 'Your Ionvex Monthly Summary — {month}',
    template: (data: { month: string; trading_volume: string; pnl: string; carbon_position: string; compliance_status: string }) => `
      <div style="max-width:600px;margin:0 auto;font-family:Inter,sans-serif">
        <div style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#3b82f6;margin:0">Ionvex</h1>
        </div>
        <div style="padding:32px;background:#fff">
          <h2 style="color:#0f172a">Monthly Summary — ${esc(data.month)}</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b">Trading Volume</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:600;text-align:right">${esc(data.trading_volume)}</td></tr>
            <tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b">P&L</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:600;text-align:right;color:#059669">${esc(data.pnl)}</td></tr>
            <tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b">Carbon Position</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:600;text-align:right">${esc(data.carbon_position)}</td></tr>
            <tr><td style="padding:12px;color:#64748b">Compliance Status</td><td style="padding:12px;font-weight:600;text-align:right;color:#059669">${esc(data.compliance_status)}</td></tr>
          </table>
          <a href="https://et.vantax.co.za/analytics" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Full Report</a>
        </div>
        <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          GONXT Technology (Pty) Ltd &bull; Lanseria Corporate Park &bull; <a href="https://et.vantax.co.za/settings" style="color:#3b82f6">Unsubscribe</a>
        </div>
      </div>
    `,
  },
};
