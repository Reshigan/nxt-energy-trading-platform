import { JwtPayload, Role, HonoEnv } from '../utils/types';

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

async function getSigningKey(secret?: string): Promise<CryptoKey> {
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured. All auth endpoints are unavailable.');
  }
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss'>,
  secret?: string,
  expirySeconds?: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iss: 'nxt-energy-platform',
    iat: now,
    exp: now + (expirySeconds ?? JWT_EXPIRY_SECONDS),
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

export async function verifyJwt(token: string, secret?: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await getSigningKey(secret);
    const encoder = new TextEncoder();
    const signature = base64urlDecode(signatureB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(signingInput));
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload: JwtPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function signRefreshToken(participantId: string, secret?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const payload = {
    sub: participantId,
    type: 'refresh',
    jti,
    iss: 'nxt-energy-platform',
    iat: now,
    exp: now + REFRESH_EXPIRY_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

export async function isTokenBlacklisted(kv: KVNamespace, token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  const result = await kv.get(`blacklist:${tokenHash}`);
  return result !== null;
}

export async function blacklistToken(kv: KVNamespace, token: string, ttlSeconds: number): Promise<void> {
  const tokenHash = await hashToken(token);
  await kv.put(`blacklist:${tokenHash}`, '1', { expirationTtl: Math.max(ttlSeconds, 60) });
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
