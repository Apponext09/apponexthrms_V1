import crypto from 'crypto';
import { getEnv } from '../../config/env';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Returns a 32-byte (256-bit) Buffer derived from the ENCRYPTION_KEY env var.
 * If the key is exactly 32 bytes, it is used as-is.
 * If it is longer/shorter, it is hashed with SHA-256 to produce a stable 32-byte key.
 */
function getKey(): Buffer {
  const raw = getEnv().ENCRYPTION_KEY;
  const buf = Buffer.from(raw, 'utf-8');
  if (buf.length === 32) return buf;
  // SHA-256 always produces 32 bytes — safe for any key length
  return crypto.createHash('sha256').update(buf).digest();
}

/**
 * Encrypts a plain-text string using AES-256-CBC.
 *
 * Output format:  <iv_hex>:<ciphertext_hex>
 * Example:        "a1b2c3...16bytes:e5f6g7...Nbytes"
 *
 * A fresh random IV is generated per call, so identical inputs produce
 * different ciphertext — prevents pattern analysis attacks.
 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string produced by encrypt().
 * Throws if the format is invalid or the key is wrong.
 */
export function decrypt(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length < 2) {
    throw new Error('[CryptoService] Invalid ciphertext format — expected iv:data');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts.slice(1).join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf-8');
}

/**
 * Safely attempt decryption — returns null if the input is not encrypted
 * (e.g., legacy plain-text rows already in the database).
 * Logs a warning so ops can identify rows that need re-encryption.
 */
export function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  // Quick heuristic: encrypted strings always contain exactly one ':' between
  // two hex segments. Plain JSON starts with '{'.
  if (value.trimStart().startsWith('{') || value.trimStart().startsWith('[')) {
    console.warn(
      '[CryptoService] safeDecrypt: detected unencrypted plain-text credentials — ' +
        'consider re-saving this integration to encrypt.'
    );
    return value; // pass through for backward compatibility
  }
  try {
    return decrypt(value);
  } catch {
    console.warn('[CryptoService] safeDecrypt: decryption failed, returning null');
    return null;
  }
}
