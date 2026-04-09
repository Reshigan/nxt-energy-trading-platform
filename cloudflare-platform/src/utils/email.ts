/**
 * Phase 0.5: Email sending utility.
 * Uses fetch-based email delivery (Resend API or Cloudflare Email Workers).
 * Falls back to logging if no RESEND_API_KEY is configured.
 */
import { log } from './logger';
import { EMAIL_TEMPLATES } from '../email/templates';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(env: { KV: KVNamespace; [key: string]: unknown }, options: EmailOptions): Promise<boolean> {
  const apiKey = (env as Record<string, unknown>).RESEND_API_KEY as string | undefined;

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NXT Energy <noreply@et.vantax.co.za>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });
      if (!res.ok) {
        log('error', 'email_send_failed', { to: options.to, status: res.status });
        return false;
      }
      log('info', 'email_sent', { to: options.to, subject: options.subject });
      return true;
    } catch (err) {
      log('error', 'email_send_error', { to: options.to, error: String(err) });
      return false;
    }
  }

  // No API key — log the email for dev/staging
  log('info', 'email_queued_no_provider', { to: options.to, subject: options.subject });
  // Store in KV for debugging
  try {
    const key = `email:${Date.now()}:${options.to}`;
    await env.KV.put(key, JSON.stringify({ to: options.to, subject: options.subject, html: options.html, sent_at: new Date().toISOString() }), { expirationTtl: 86400 * 7 });
  } catch { /* non-critical */ }
  return true;
}

// Convenience functions for common email types
export async function sendWelcomeEmail(env: { KV: KVNamespace; [key: string]: unknown }, to: string, name: string, company: string): Promise<boolean> {
  return sendEmail(env, {
    to,
    subject: EMAIL_TEMPLATES.welcome.subject,
    html: EMAIL_TEMPLATES.welcome.template({ name, company }),
  });
}

export async function sendVerificationEmail(env: { KV: KVNamespace; [key: string]: unknown }, to: string, otp: string): Promise<boolean> {
  return sendEmail(env, {
    to,
    subject: EMAIL_TEMPLATES.verification.subject.replace('{OTP}', otp),
    html: EMAIL_TEMPLATES.verification.template({ otp }),
  });
}

export async function sendTradeConfirmation(env: { KV: KVNamespace; [key: string]: unknown }, to: string, data: { trade_type: string; volume: string; price: string; market: string; settlement_date: string }): Promise<boolean> {
  return sendEmail(env, {
    to,
    subject: EMAIL_TEMPLATES.trade_confirmation.subject.replace('{trade_type}', data.trade_type).replace('{volume}', data.volume).replace('{price}', data.price),
    html: EMAIL_TEMPLATES.trade_confirmation.template(data),
  });
}

export async function sendInvoiceNotification(env: { KV: KVNamespace; [key: string]: unknown }, to: string, data: { invoice_number: string; total: string; due_date: string; seller: string; buyer: string }): Promise<boolean> {
  return sendEmail(env, {
    to,
    subject: EMAIL_TEMPLATES.invoice_generated.subject.replace('{invoice_number}', data.invoice_number).replace('{total}', data.total).replace('{due_date}', data.due_date),
    html: EMAIL_TEMPLATES.invoice_generated.template(data),
  });
}

export async function sendContractSignatureRequest(env: { KV: KVNamespace; [key: string]: unknown }, to: string, documentTitle: string, requester: string): Promise<boolean> {
  return sendEmail(env, {
    to,
    subject: EMAIL_TEMPLATES.contract_signature_required.subject.replace('{document_title}', documentTitle),
    html: EMAIL_TEMPLATES.contract_signature_required.template({ document_title: documentTitle, requester }),
  });
}
