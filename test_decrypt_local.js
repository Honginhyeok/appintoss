require('dotenv').config();
const crypto = require('crypto');

const encryptedB64 = "hblbgoouYAz3IMDt+nFEqc5lpaXQC9/ARSunb0OL3tIS1R/xog==";
const keyB64 = process.env.TOSS_ENCRYPTION_KEY;
const aad = process.env.TOSS_AAD;

try {
  const key = Buffer.from(keyB64, 'base64');
  const buffer = Buffer.from(encryptedB64, 'base64');

  const iv = buffer.subarray(0, 12);
  const ciphertext = buffer.subarray(12, buffer.length - 16);
  const authTag = buffer.subarray(buffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  console.log("Decrypted:", decrypted);
} catch (e) {
  console.error("Decryption failed:", e.message);
}
