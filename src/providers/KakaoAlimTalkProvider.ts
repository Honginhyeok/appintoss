import { INotificationProvider, SendResult } from '../interfaces/INotificationProvider';

export class KakaoAlimTalkProvider implements INotificationProvider {
  channelName = 'KAKAO_ALIMTALK';

  // Config mapping from our use case to Kakao's registered template ID
  private templateIdMap: Record<string, string> = {
    'RENT_DUE': 'kakao_tpl_rent_due_01',
    'OVERDUE_PAYMENT': 'kakao_tpl_overdue_01',
    'CONTRACT_ENDING': 'kakao_tpl_contract_01',
    'MAINTENANCE_REQUEST_RECEIVED': 'kakao_tpl_maint_recv_01',
    'MAINTENANCE_COMPLETED': 'kakao_tpl_maint_comp_01',
  };

  async send(to: string, message: string, useCase?: string): Promise<SendResult> {
    console.log(`[KakaoProvider] Preparing to send to ${to}...`);
    
    // In a real integration, useCase would map to Kakao's registered template ID 
    // and we would call the provider's API (e.g. Solapi, Aligo) with Axios/Fetch
    const kakaoTemplateId = useCase ? this.templateIdMap[useCase] : null;

    try {
      // MOCK API CALL
      // const response = await axios.post('https://api.kakaoprovider.example', { ... });
      
      // Simulate random failure to demonstrate SMS fallback
      const isSimulatedFailure = Math.random() < 0.2; 
      
      if (isSimulatedFailure) {
        throw new Error('Kakao AlimTalk delivery failed: User not registered or blocked.');
      }

      console.log(`[KakaoProvider] Successfully sent AlimTalk to ${to} (Template: ${kakaoTemplateId})`);
      return {
        success: true,
        messageId: `kakao_${Date.now()}`
      };
    } catch (error: any) {
      console.error(`[KakaoProvider] Error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
