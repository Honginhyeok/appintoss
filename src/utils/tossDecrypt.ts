import crypto from 'crypto';
import { TOSS_ENCRYPTION_KEY, TOSS_AAD } from '../config/env';

export function decryptTossData(encryptedB64: string | null): string {
  if (!encryptedB64) return '';

  try {
    const keyB64 = TOSS_ENCRYPTION_KEY;
    if (!keyB64) {
      console.warn('TOSS_ENCRYPTION_KEY is missing');
      return encryptedB64;
    }

    const key = Buffer.from(keyB64, 'base64');
    const buffer = Buffer.from(encryptedB64, 'base64');

    // Toss AES-256-GCM (IV 12bytes + Ciphertext + Tag 16bytes)
    const iv = buffer.subarray(0, 12);
    const ciphertext = buffer.subarray(12, buffer.length - 16);
    const authTag = buffer.subarray(buffer.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // TOSS_AAD가 환경변수에 있다면 적용, 없으면 생략
    const aad = TOSS_AAD;
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    console.error('Toss Decryption Failed:', e);
    return '토스유저'; // 실패 시 기본값
  }
}
