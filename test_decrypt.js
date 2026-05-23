const crypto = require('crypto');

const keyB64 = "jazQ5F5D9sm/GE8+TwpWCIyk97M/mYeW6dSLiWFq87c=";
const key = Buffer.from(keyB64, 'base64');
const encryptedB64 = "D93cBF36Xgl9pDXwOApUX56MciIe/fTnKGhWvUlBsaPjD8kwfQ==";
const buffer = Buffer.from(encryptedB64, 'base64');

try {
  const iv = buffer.slice(0, 12);
  const ciphertext = buffer.slice(12, buffer.length - 16);
  const authTag = buffer.slice(buffer.length - 16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from('TOSS', 'utf8'));
  
  let decrypted = decipher.update(ciphertext, null, 'utf8');
  decrypted += decipher.final('utf8');
  
  console.log('Decrypted:', decrypted);
} catch (e) {
  console.error('Failed:', e.message);
}
