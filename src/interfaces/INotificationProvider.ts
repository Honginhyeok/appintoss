export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface INotificationProvider {
  /**
   * The unique identifier for the channel (e.g., KAKAO_ALIMTALK, SMS)
   */
  channelName: string;

  /**
   * Sends a message to the specified recipient.
   * @param to Phone number of the recipient
   * @param message The text content of the message
   * @param useCase Optional use case identifier to map to provider-specific templates (e.g., Kakao requires specific template IDs)
   */
  send(to: string, message: string, useCase?: string): Promise<SendResult>;
}
