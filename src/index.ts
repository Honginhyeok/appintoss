import { NotificationService } from './services/NotificationService';
import { KakaoAlimTalkProvider } from './providers/KakaoAlimTalkProvider';
import { SMSProvider } from './providers/SMSProvider';
import { PrismaLogger } from './services/PrismaLogger';
import { NotificationUseCase } from './domain/NotificationTemplate';

async function runDemo() {
  const kakao = new KakaoAlimTalkProvider();
  const sms = new SMSProvider();
  const logger = new PrismaLogger();

  const service = new NotificationService(kakao, sms, logger);

  console.log("--- Sending Rent Due Notification ---");
  await service.sendNotification({
    to: '010-1234-5678',
    tenantId: 'tenant_1',
    useCase: NotificationUseCase.RENT_DUE,
    data: {
      tenantName: '홍길동',
      amount: '500,000',
      dueDate: '2026-05-01'
    },
    isManual: false,
  });

  console.log("\n--- Sending Maintenance Completed (Manual) ---");
  await service.sendNotification({
    to: '010-9876-5432',
    tenantId: 'tenant_2',
    useCase: NotificationUseCase.MAINTENANCE_COMPLETED,
    data: {},
    isManual: true, // Triggered manually by Admin
  });

  console.log("\n--- Dumping Notification Logs ---");
  const logs = await logger.getLogs();
  console.log(JSON.stringify(logs, null, 2));
}

runDemo().catch(console.error);
