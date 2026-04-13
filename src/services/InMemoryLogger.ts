import { INotificationLogger, NotificationLog, DeliveryStatus, NotificationChannel } from '../domain/NotificationLog';

export class InMemoryLogger implements INotificationLogger {
  private logs: NotificationLog[] = [];

  async log(entry: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    const newLog: NotificationLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    this.logs.push(newLog);
    return newLog;
  }

  async updateStatus(id: string, status: DeliveryStatus, channel?: NotificationChannel, failureReason?: string): Promise<void> {
    const logIndex = this.logs.findIndex((l) => l.id === id);
    if (logIndex !== -1) {
      if (channel) this.logs[logIndex].channel = channel;
      this.logs[logIndex].status = status;
      if (status === 'SENT') {
        this.logs[logIndex].sentAt = new Date();
      }
      if (failureReason) {
        this.logs[logIndex].failureReason = failureReason;
      }
    }
  }

  getLogs(): NotificationLog[] {
    return this.logs;
  }
}
