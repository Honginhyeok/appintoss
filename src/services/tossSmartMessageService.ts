import axios from 'axios';

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
    const response = await axios.post(
      'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message',
      {
        templateSetCode: templateCode,
        context: context,
      },
      {
        headers: {
          'Content-Type': 'application/json',
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
