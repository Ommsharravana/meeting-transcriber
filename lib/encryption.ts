import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Key should be 32 bytes (256 bits) for AES-256
  // Accept hex-encoded key (64 chars) or raw 32-byte key
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  } else if (key.length === 32) {
    return Buffer.from(key);
  } else {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (or 64 hex characters)');
  }
}

/**
 * Encrypt an API key for storage
 * @param plainKey The plain text API key
 * @returns Encrypted key as base64 string (iv:authTag:ciphertext)
 */
export function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainKey, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an API key from storage
 * @param encryptedKey The encrypted key string (iv:authTag:ciphertext)
 * @returns The decrypted plain text API key
 */
export function decryptApiKey(encryptedKey: string): string {
  const key = getEncryptionKey();

  const parts = encryptedKey.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Get a hint for displaying the API key (last 4 characters)
 * @param plainKey The plain text API key
 * @returns Last 4 characters of the key, or full key if shorter
 */
export function getKeyHint(plainKey: string): string {
  if (plainKey.length <= 4) {
    return plainKey;
  }
  return `...${plainKey.slice(-4)}`;
}

/**
 * Mask an API key for display (show only last 4 chars)
 * @param plainKey The plain text API key
 * @returns Masked key like "sk-...abcd"
 */
export function maskApiKey(plainKey: string): string {
  if (plainKey.length <= 8) {
    return '****';
  }
  const prefix = plainKey.slice(0, 3);
  const suffix = plainKey.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Generate a secure encryption key (for initial setup)
 * @returns A random 32-byte key as hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
