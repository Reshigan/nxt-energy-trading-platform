import { AppBindings } from '../utils/types';

export interface PaymentRequest {
  amount_cents: number;
  currency: string;
  from_participant_id: string;
  to_participant_id: string;
  reference: string;
  description: string;
}

export interface PaymentResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider_ref: string | null;
  provider: string;
  error?: string;
}

export async function initiatePayment(
  env: AppBindings,
  req: PaymentRequest,
): Promise<PaymentResult> {
  const provider = (env.PAYMENT_PROVIDER as string) || 'mock';

  switch (provider) {
    case 'stitch': return stitchPayment(env, req);
    case 'ozow': return ozowPayment(env, req);
    default: return mockPayment(req);
  }
}

async function mockPayment(req: PaymentRequest): Promise<PaymentResult> {
  return {
    status: 'pending',
    provider_ref: `MOCK-${Date.now()}-${req.reference}`,
    provider: 'mock',
  };
}

async function stitchPayment(env: AppBindings, req: PaymentRequest): Promise<PaymentResult> {
  const apiKey = env.STITCH_API_KEY as string | undefined;
  if (!apiKey) return { status: 'failed', provider_ref: null, provider: 'stitch', error: 'Stitch API key not configured' };

  try {
    const response = await fetch('https://api.stitch.money/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: { quantity: req.amount_cents, currency: req.currency },
        beneficiary: { bankId: req.to_participant_id },
        payerReference: req.reference,
        beneficiaryReference: req.description,
      }),
    });
    const data = await response.json() as { id?: string; status?: string; error?: string };
    if (!response.ok) return { status: 'failed', provider_ref: null, provider: 'stitch', error: data.error || 'Stitch API error' };
    return { status: 'processing', provider_ref: data.id ?? null, provider: 'stitch' };
  } catch (err) {
    return { status: 'failed', provider_ref: null, provider: 'stitch', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function ozowPayment(env: AppBindings, req: PaymentRequest): Promise<PaymentResult> {
  const apiKey = env.OZOW_API_KEY as string | undefined;
  const siteCode = env.OZOW_SITE_CODE as string | undefined;
  if (!apiKey || !siteCode) return { status: 'failed', provider_ref: null, provider: 'ozow', error: 'Ozow credentials not configured' };

  try {
    const response = await fetch('https://api.ozow.com/PostPaymentRequest', {
      method: 'POST',
      headers: { 'ApiKey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteCode,
        amount: req.amount_cents / 100,
        transactionReference: req.reference,
        bankReference: req.description,
        currencyCode: req.currency,
      }),
    });
    const data = await response.json() as { paymentRequestId?: string; errorMessage?: string };
    if (!response.ok) return { status: 'failed', provider_ref: null, provider: 'ozow', error: data.errorMessage || 'Ozow API error' };
    return { status: 'processing', provider_ref: data.paymentRequestId ?? null, provider: 'ozow' };
  } catch (err) {
    return { status: 'failed', provider_ref: null, provider: 'ozow', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
