/**
 * ECT Act Section 13 compliant signing certificate generator
 * Generates a JSON certificate per signature event with tamper-evident hash chain
 */

import { sha256 } from './hash';
import { nowISO } from './id';

export interface SigningCertificate {
  certificate_serial: string;
  platform: string;
  platform_version: string;
  ect_act_notice: string;
  document_id: string;
  document_title: string;
  document_hash: string;
  signatory: {
    participant_id: string;
    name: string;
    designation: string;
  };
  signing_timestamp: string;
  ip_address: string;
  signature_image_hash: string;
  chain_hash: string;
  integrity_seal?: string;
}

const ECT_ACT_NOTICE =
  'This electronic signature is deemed to comply with the Electronic Communications ' +
  'and Transactions Act 25 of 2002, Section 13, as a data message. The signature is ' +
  'uniquely linked to the signatory, capable of identifying the signatory, created using ' +
  'means under the sole control of the signatory, and linked to the data to which it ' +
  'relates in such a manner that any subsequent change of the data is detectable.';

/**
 * Generate a unique certificate serial number
 */
function generateCertSerial(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `NXT-CERT-${Date.now()}-${hex.toUpperCase()}`;
}

/**
 * Compute chain hash: hash(previousChainHash + currentEventData)
 * Creates a tamper-evident chain where modifying any event breaks the chain
 */
export async function computeChainHash(
  previousChainHash: string | null,
  documentHash: string,
  signatoryId: string,
  timestamp: string,
  ipAddress: string,
): Promise<string> {
  const data = [
    previousChainHash || 'GENESIS',
    documentHash,
    signatoryId,
    timestamp,
    ipAddress,
  ].join('|');

  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  return sha256(buffer.buffer as ArrayBuffer);
}

/**
 * Compute document integrity seal after all parties sign
 * Hash of all signature hashes + document hash + all timestamps
 */
export async function computeIntegritySeal(
  documentHash: string,
  signatureHashes: Array<{ hash: string; timestamp: string }>,
): Promise<string> {
  const parts = [documentHash];
  for (const sig of signatureHashes) {
    parts.push(sig.hash);
    parts.push(sig.timestamp);
  }
  const data = parts.join('|');
  const encoder = new TextEncoder();
  return sha256(encoder.encode(data).buffer as ArrayBuffer);
}

/**
 * Generate a signing certificate for a signature event
 */
export async function generateSigningCertificate(params: {
  documentId: string;
  documentTitle: string;
  documentHash: string;
  signatoryId: string;
  signatoryName: string;
  signatoryDesignation: string;
  ipAddress: string;
  signatureImageBuffer: ArrayBuffer;
  previousChainHash: string | null;
}): Promise<SigningCertificate> {
  const timestamp = nowISO();
  const signatureImageHash = await sha256(params.signatureImageBuffer);
  const chainHash = await computeChainHash(
    params.previousChainHash,
    params.documentHash,
    params.signatoryId,
    timestamp,
    params.ipAddress,
  );

  return {
    certificate_serial: generateCertSerial(),
    platform: 'NXT Open Market Energy Trading Platform',
    platform_version: '2.0.0',
    ect_act_notice: ECT_ACT_NOTICE,
    document_id: params.documentId,
    document_title: params.documentTitle,
    document_hash: params.documentHash,
    signatory: {
      participant_id: params.signatoryId,
      name: params.signatoryName,
      designation: params.signatoryDesignation,
    },
    signing_timestamp: timestamp,
    ip_address: params.ipAddress,
    signature_image_hash: signatureImageHash,
    chain_hash: chainHash,
  };
}
