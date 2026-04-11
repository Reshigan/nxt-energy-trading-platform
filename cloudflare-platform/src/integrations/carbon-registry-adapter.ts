import { AppBindings } from '../utils/types';

export type RegistryType = 'verra' | 'goldstandard' | 'irec' | 'mock';

export interface RegistrySyncResult {
  registry: RegistryType;
  credits_synced: number;
  credits_updated: number;
  errors: string[];
}

export async function syncRegistry(
  env: AppBindings,
  registry: string,
): Promise<RegistrySyncResult> {
  const registryType = registry as RegistryType;
  switch (registryType) {
    case 'verra': return syncVerra(env);
    case 'goldstandard': return syncGoldStandard(env);
    case 'irec': return syncIREC(env);
    default: return syncMock(env);
  }
}

async function syncMock(env: AppBindings): Promise<RegistrySyncResult> {
  const count = await env.DB.prepare('SELECT COUNT(*) as c FROM carbon_credits').first<{ c: number }>();
  return { registry: 'mock', credits_synced: count?.c ?? 0, credits_updated: 0, errors: [] };
}

async function syncVerra(env: AppBindings): Promise<RegistrySyncResult> {
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM carbon_credits WHERE registry = 'verra'").first<{ c: number }>();
  return { registry: 'verra', credits_synced: count?.c ?? 0, credits_updated: 0, errors: ['Verra API not yet configured'] };
}

async function syncGoldStandard(env: AppBindings): Promise<RegistrySyncResult> {
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM carbon_credits WHERE registry = 'goldstandard'").first<{ c: number }>();
  return { registry: 'goldstandard', credits_synced: count?.c ?? 0, credits_updated: 0, errors: ['Gold Standard API not yet configured'] };
}

async function syncIREC(env: AppBindings): Promise<RegistrySyncResult> {
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM carbon_credits WHERE registry = 'irec'").first<{ c: number }>();
  return { registry: 'irec', credits_synced: count?.c ?? 0, credits_updated: 0, errors: ['I-REC API not yet configured'] };
}
