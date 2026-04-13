export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationChannel = 'KAKAO_ALIMTALK' | 'SMS' | 'UNKNOWN';

export interface NotificationLog {
  id: string;
  tenantId: string;
  useCase: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  sentAt: Date | null;
  failureReason?: string;
  isManual: boolean; // Indicates if it was sent manually from the admin page
  content: string;
}

export interface INotificationLogger {
  log(entry: Omit<NotificationLog, 'id'>): Promise<NotificationLog>;
  updateStatus(id: string, status: DeliveryStatus, channel?: NotificationChannel, failureReason?: string): Promise<void>;
}
