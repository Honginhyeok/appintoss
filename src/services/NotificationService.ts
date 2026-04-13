import { INotificationProvider } from '../interfaces/INotificationProvider';
import { INotificationLogger, NotificationLog, NotificationChannel } from '../domain/NotificationLog';
import { NotificationUseCase, compileTemplate } from '../domain/NotificationTemplate';

export interface SendNotificationOptions {
  to: string;
  tenantId: string;
  useCase: NotificationUseCase;
  data: Record<string, string | number>;
  isManual?: boolean;
}

export class NotificationService {
  private primaryProvider: INotificationProvider;
  private fallbackProvider: INotificationProvider;
  private logger: INotificationLogger;

  constructor(
    primaryProvider: INotificationProvider,
    fallbackProvider: INotificationProvider,
    logger: INotificationLogger
  ) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
    this.logger = logger;
  }

  /**
   * Sends a notification using the primary provider (Kakao).
   * If it fails, falls back to the secondary provider (SMS).
   * Logs all attempts and their statuses.
   */
  async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    const { to, tenantId, useCase, data, isManual = false } = options;

    const messageContent = compileTemplate(useCase, data);

    // Initial log entry (Pending)
    const logEntry = await this.logger.log({
      tenantId,
      useCase,
      channel: 'UNKNOWN', // Will update later
      status: 'PENDING',
      sentAt: null,
      isManual,
      content: messageContent,
    });

    try {
      // Attempt 1: Primary Channel (Kakao AlimTalk)
      const primaryResult = await this.primaryProvider.send(to, messageContent, useCase);

      if (primaryResult.success) {
        await this.logger.updateStatus(logEntry.id, 'SENT', 'KAKAO_ALIMTALK');
        return true;
      }

      // If Kakao returns false (e.g., user not on Kakao), log and fallback
      console.warn(`[NotificationService] Kakao failed for ${to}. Reason: ${primaryResult.error}. Falling back to SMS.`);
      
    } catch (error: any) {
      console.warn(`[NotificationService] Kakao threw an error for ${to}. Error: ${error.message}. Falling back to SMS.`);
    }

    // Attempt 2: Fallback Channel (SMS)
    try {
      const fallbackResult = await this.fallbackProvider.send(to, messageContent, useCase);

      if (fallbackResult.success) {
        await this.logger.updateStatus(logEntry.id, 'SENT', 'SMS', 'Sent via SMS fallback after Kakao failed');
        return true;
      }

      // If SMS also fails, we've failed entirely
      await this.logger.updateStatus(
        logEntry.id, 
        'FAILED', 
        'SMS',
        `All channels failed. Final error: ${fallbackResult.error}`
      );
      return false;

    } catch (error: any) {
      await this.logger.updateStatus(
        logEntry.id, 
        'FAILED', 
        'UNKNOWN',
        `All channels failed with exceptions. Final Error: ${error.message}`
      );
      return false;
    }
  }
}
