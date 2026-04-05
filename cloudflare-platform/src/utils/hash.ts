/**
 * Compute SHA-256 hash of an ArrayBuffer
 */
export async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a document stored in R2
 */
export async function hashDocument(r2Key: string, r2: R2Bucket): Promise<string> {
  const obj = await r2.get(r2Key);
  if (!obj) throw new Error('Document not found in R2');
  const buffer = await obj.arrayBuffer();
  return sha256(buffer);
}

/**
 * Hash a password using SHA-256 with salt
 * For production use a proper KDF like Argon2/scrypt, but
 * Workers don't support them natively so we use PBKDF2
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const useSalt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(useSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt: useSalt };
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}
