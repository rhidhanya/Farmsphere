const crypto = require('crypto');

// AES‑256‑GCM encryption utility for sensitive fields (e.g., Aadhaar)
// The encryption key must be a 32‑byte base64 string provided via AADHAAR_ENC_KEY env var.
// In production, store the key securely (e.g., Secret Manager, env var). Do NOT commit real keys.

const getKey = () => {
  const keyB64 = process.env.AADHAAR_ENC_KEY;
  if (!keyB64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AADHAAR_ENC_KEY environment variable is required for Aadhaar encryption in production');
    }
    // Safe deterministic 32-byte development/test fallback
    return Buffer.from('fpo_default_dev_aadhaar_key_32b!', 'utf8');
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('AADHAAR_ENC_KEY must be a 32‑byte (256‑bit) base64‑encoded key');
  }
  return key;
};

/**
 * Encrypt a plaintext string.
 * Returns a base64 string containing iv + authTag + ciphertext.
 */
function encrypt(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96‑bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  // Concatenate iv|authTag|ciphertext, all base64‑encoded for storage
  const payload = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]).toString('base64');
  return payload;
}

/**
 * Decrypt a value produced by encrypt().
 */
function decrypt(cipherPayload) {
  const key = getKey();
  const data = Buffer.from(cipherPayload, 'base64');
  const iv = data.slice(0, 12);
  const authTag = data.slice(12, 28);
  const ciphertext = data.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
