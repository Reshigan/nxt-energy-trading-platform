import { AppBindings } from '../utils/types';
import { generateId } from '../utils/id';

export type RegulatoryProvider = 'cipc' | 'sars_tax' | 'sars_vat' | 'nersa' | 'fsca' | 'sanctions' | 'fica';

export interface RegulatoryRequest {
  participant_id: string;
  provider: RegulatoryProvider;
  registration_number?: string;
  tax_number?: string;
  id_number?: string;
  company_name?: string;
}

export interface RegulatoryResult {
  status: 'verified' | 'failed' | 'pending' | 'manual_review';
  external_ref: string | null;
  details?: string;
}

export async function verifyRegulatory(
  env: AppBindings,
  req: RegulatoryRequest,
): Promise<RegulatoryResult> {
  const id = generateId();
  let result: RegulatoryResult;

  try {
    switch (req.provider) {
      case 'cipc': result = await verifyCIPC(req); break;
      case 'sars_tax':
      case 'sars_vat': result = await verifySARS(req); break;
      case 'nersa': result = await verifyNERSA(); break;
      case 'fsca': result = await verifyFSCA(); break;
      case 'sanctions': result = await checkSanctions(req); break;
      case 'fica': result = await verifyFICA(req); break;
      default: result = { status: 'failed', external_ref: null, details: 'Unknown provider' };
    }
  } catch (err) {
    result = { status: 'failed', external_ref: null, details: err instanceof Error ? err.message : 'Unknown error' };
  }

  await env.DB.prepare(
    "INSERT INTO regulatory_verifications (id, participant_id, provider, external_ref, request_payload, response_payload, status, verified_at, created_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))"
  ).bind(id, req.participant_id, req.provider, result.external_ref, JSON.stringify(req), JSON.stringify(result), result.status).run();

  return result;
}

async function verifyCIPC(req: RegulatoryRequest): Promise<RegulatoryResult> {
  if (!req.registration_number) return { status: 'failed', external_ref: null, details: 'Registration number required' };
  return { status: 'verified', external_ref: `CIPC-${Date.now()}`, details: 'Company registration verified (mock)' };
}

async function verifySARS(req: RegulatoryRequest): Promise<RegulatoryResult> {
  if (!req.tax_number) return { status: 'failed', external_ref: null, details: 'Tax number required' };
  return { status: 'verified', external_ref: `SARS-${Date.now()}`, details: 'Tax compliance verified (mock)' };
}

async function verifyNERSA(): Promise<RegulatoryResult> {
  return { status: 'verified', external_ref: `NERSA-${Date.now()}`, details: 'Energy license verified (mock)' };
}

async function verifyFSCA(): Promise<RegulatoryResult> {
  return { status: 'verified', external_ref: `FSCA-${Date.now()}`, details: 'Financial services license verified (mock)' };
}

async function checkSanctions(req: RegulatoryRequest): Promise<RegulatoryResult> {
  if (!req.company_name && !req.id_number) return { status: 'failed', external_ref: null, details: 'Company name or ID required' };
  return { status: 'verified', external_ref: `SANC-${Date.now()}`, details: 'No sanctions matches found (mock)' };
}

async function verifyFICA(req: RegulatoryRequest): Promise<RegulatoryResult> {
  if (!req.id_number) return { status: 'failed', external_ref: null, details: 'ID number required for FICA' };
  return { status: 'verified', external_ref: `FICA-${Date.now()}`, details: 'FICA verification complete (mock)' };
}
