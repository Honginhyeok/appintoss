import axios, { AxiosInstance } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';

// mTLS를 위한 인증서 로드
let httpsAgent: https.Agent | null = null;
try {
  const certPath = path.resolve(process.cwd(), 'src/config/certs/03.v_public.crt');
  const keyPath = path.resolve(process.cwd(), 'src/config/certs/03.v_private.key');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    });
    console.log('✅ [Toss Smart Message] Successfully initialized mTLS Agent.');
  } else {
    console.warn('⚠️ [Toss Smart Message] Certificates not found. mTLS Agent is not active.');
  }
} catch (error) {
  console.error('❌ [Toss Smart Message] Failed to initialize mTLS Agent:', error);
}

// Basic Auth + mTLS가 적용된 Axios 클라이언트 lazy 초기화
let _tossApiClient: AxiosInstance | null = null;
function getTossApiClient(): AxiosInstance {
  if (!_tossApiClient) {
    const clientId = process.env.TOSS_CLIENT_ID;
    const secretKey = process.env.TOSS_SECRET_KEY;
    _tossApiClient = axios.create({
      baseURL: 'https://apps-in-toss-api.toss.im',
      httpsAgent: httpsAgent || undefined,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }
  return _tossApiClient;
}

/**
 * 토스 스마트 메시지(푸시 알림)를 발송하는 서비스입니다.
 * 
 * @param userKey 토스 유저 고유 식별 키 (X-Toss-User-Key)
 * @param templateCode 토스 스마트 메시지 콘솔에서 설정한 '발송 코드'
 * @param context 알림 내용에 포함될 동적 변수들 (예: { amount: "500000" })
 */
export const sendTossSmartMessage = async (
  userKey: string,
  templateCode: string,
  context: Record<string, string> = {}
) => {
  try {
    const response = await getTossApiClient().post(
      '/api-partner/v1/apps-in-toss/messenger/send-message',
      {
        templateSetCode: templateCode,
        context: context,
      },
      {
        headers: {
          'X-Toss-User-Key': userKey,
        },
      }
    );
    
    console.log(`[Toss Smart Message] 성공적으로 발송되었습니다. (Template: ${templateCode})`);
    return response.data;
  } catch (error: any) {
    console.error(
      '[Toss Smart Message] 발송 실패:',
      error.response?.data || error.message
    );
    throw error;
  }
};
