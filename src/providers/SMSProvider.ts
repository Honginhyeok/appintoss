import { INotificationProvider, SendResult } from '../interfaces/INotificationProvider';

export class SMSProvider implements INotificationProvider {
  channelName = 'SMS';

  async send(to: string, message: string, useCase?: string): Promise<SendResult> {
    console.log(`[SMSProvider] Preparing to send to ${to}...`);
    
    try {
      // MOCK API CALL
      // const response = await axios.post('https://api.smsprovider.example', { to, text: message });
      
      console.log(`[SMSProvider] Successfully sent SMS to ${to}. Message preview: "${message.substring(0, 20)}..."`);
      return {
        success: true,
        messageId: `sms_${Date.now()}`
      };
    } catch (error: any) {
      console.error(`[SMSProvider] Error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
