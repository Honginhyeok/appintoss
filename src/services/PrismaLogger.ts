import { PrismaClient } from '@prisma/client';
import { INotificationLogger, NotificationLog, DeliveryStatus, NotificationChannel } from '../domain/NotificationLog';

const prisma = new PrismaClient();

export class PrismaLogger implements INotificationLogger {
  async log(entry: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    const createdLog = await prisma.notificationLog.create({
      data: {
        tenantId: entry.tenantId,
        useCase: entry.useCase,
        channel: entry.channel,
        status: entry.status,
        sentAt: entry.sentAt,
        isManual: entry.isManual,
        content: entry.content,
      },
    });

    return {
      ...createdLog,
      channel: createdLog.channel as NotificationChannel,
      status: createdLog.status as DeliveryStatus,
      failureReason: createdLog.failureReason ?? undefined,
    };
  }

  async updateStatus(
    id: string, 
    status: DeliveryStatus, 
    channel?: NotificationChannel, 
    failureReason?: string
  ): Promise<void> {
    const updateData: any = {
      status,
    };

    if (channel) updateData.channel = channel;
    if (failureReason) updateData.failureReason = failureReason;
    if (status === 'SENT') {
      updateData.sentAt = new Date();
    }

    await prisma.notificationLog.update({
      where: { id },
      data: updateData,
    });
  }

  // Not part of the interface, but helpful to see logs
  async getLogs(): Promise<NotificationLog[]> {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return logs.map((log: any) => ({
      ...log,
      channel: log.channel as NotificationChannel,
      status: log.status as DeliveryStatus,
      failureReason: log.failureReason ?? undefined,
    }));
  }
}
