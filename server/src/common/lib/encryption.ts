import crypto from 'crypto';
import { getEnv } from '../../config/env';

/**
 * AES-256-GCM encryption/decryption for sensitive fields
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Encrypt a value using AES-256-GCM
 * Returns: base64(salt + iv + ciphertext + authTag)
 */
export function encrypt(plaintext: string): string {
  const env = getEnv();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from master key + salt
  const key = crypto.pbkdf2Sync(env.ENCRYPTION_KEY, salt, 100000, 32, 'sha256');

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'binary');
  ciphertext += cipher.final('binary');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine all parts: salt + iv + ciphertext + authTag
  const encrypted = Buffer.concat([
    salt,
    iv,
    Buffer.from(ciphertext, 'binary'),
    authTag,
  ]);

  return encrypted.toString('base64');
}

/**
 * Decrypt a value encrypted with encrypt()
 */
export function decrypt(encrypted: string): string {
  const env = getEnv();

  try {
    // Decode from base64
    const buffer = Buffer.from(encrypted, 'base64');

    // Extract parts
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(buffer.length - TAG_LENGTH);
    const ciphertext = buffer.subarray(SALT_LENGTH + IV_LENGTH, buffer.length - TAG_LENGTH);

    // Derive key from master key + salt
    const key = crypto.pbkdf2Sync(env.ENCRYPTION_KEY, salt, 100000, 32, 'sha256');

    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'binary', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    throw new Error('Decryption failed: invalid encrypted data or wrong key');
  }
}

/**
 * Hash a value using SHA256 (for one-way hashing, e.g., tokens)
 */
export function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a random token (useful for OTP, password reset codes, etc.)
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Constant-time comparison for tokens (prevent timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
