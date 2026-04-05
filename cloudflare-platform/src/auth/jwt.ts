import { JwtPayload, Role } from '../utils/types';

// HMAC key for JWT signing (in production, use KV-stored RSA keys)
// For Workers, we use HMAC-SHA256 which is natively supported
const JWT_SECRET = 'nxt-energy-platform-jwt-secret-key-2024';
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const REFRESH_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

function base64urlEncode(data: Uint8Array): string {
  const str = String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iss: 'nxt-energy-platform',
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const signature = base64urlDecode(signatureB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(signingInput));
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload: JwtPayload = JSON.parse(payloadJson);

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function signRefreshToken(participantId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: participantId,
    type: 'refresh',
    iss: 'nxt-energy-platform',
    iat: now,
    exp: now + REFRESH_EXPIRY_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}
