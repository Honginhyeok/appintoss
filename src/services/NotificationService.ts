import { INotificationProvider } from '../interfaces/INotificationProvider';
import { INotificationLogger, NotificationLog, NotificationChannel } from '../domain/NotificationLog';
import { NotificationUseCase, compileTemplate } from '../domain/NotificationTemplate';
import { prisma } from '../config/db';
import { sendTossSmartMessage } from './tossSmartMessageService';

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
   * Sends a notification.
   * If the recipient is a Toss user, it attempts to send a Toss Smart Message (Push Notification) as highest priority.
   * If it succeeds, it logs channel as 'TOSS_PUSH' and status as 'SENT'.
   * If they are not a Toss user, or if Toss Push fails:
   *   - We DO NOT fall back to Kakao/SMS (per user request).
   *   - Instead, we create a web-only In-App notification ('Notification' model) so they can view it inside the web app,
   *     and log status as 'SENT' with channel 'IN_APP_WEB'.
   */
  async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    const { to, tenantId, useCase, data, isManual = false } = options;

    const messageContent = compileTemplate(useCase, data);

    // Initial log entry (Pending)
    const logEntry = await this.logger.log({
      tenantId,
      useCase,
      channel: 'UNKNOWN',
      status: 'PENDING',
      sentAt: null,
      isManual,
      content: messageContent,
    });

    try {
      // 1. 세입자 및 유저 정보 조회
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { room: true }
      });

      let userKey: string | null = null;
      let loginUserId: string | null = null;

      if (tenant?.loginUserId) {
        loginUserId = tenant.loginUserId;
        const user = await prisma.user.findUnique({ where: { id: tenant.loginUserId } });
        if (user?.username.startsWith('toss_')) {
          userKey = user.username.substring(5); // 'toss_' 접두사 제거
        }
      }

      // 2. 만약 토스 로그인 회원인 경우 -> 최우선으로 토스 스마트메시지(푸시) 발송 시도
      let tossSent = false;
      if (userKey) {
        try {
          console.log(`[NotificationService] Attempting Toss Push for tenant ${tenant?.name} (userKey: ${userKey})`);
          
          // RENT_DUE 또는 OVERDUE_PAYMENT 인 경우 월세청구서 템플릿 코드 사용
          const isPaymentUseCase = useCase === NotificationUseCase.RENT_DUE || useCase === NotificationUseCase.OVERDUE_PAYMENT;
          const templateCode = isPaymentUseCase 
            ? 'check-in-host-REQUEST_RENT_PAYMENT_V2' 
            : 'check-in-host-REQUEST_RENT_PAYMENT_V2'; // 다른 알림도 일단 등록된 템플릿 사용 (또는 기본 템플릿 확장)

          const context = {
            tenantName: String(data.tenantName || tenant?.name || ''),
            roomName: String(data.roomName || tenant?.room?.name || '미배정'),
            amount: String(data.amount || tenant?.rentAmount?.toLocaleString() || '0'),
            dueDate: String(data.dueDate || (tenant?.rentPaymentDay ? `매월 ${tenant.rentPaymentDay}일` : '-'))
          };

          await sendTossSmartMessage(userKey, templateCode, context);
          tossSent = true;
          console.log(`[NotificationService] Toss Push succeeded for tenant ${tenant?.name}`);
        } catch (tossError: any) {
          console.error(`[NotificationService] Toss Push failed for ${to}. Error: ${tossError.message}.`);
        }
      }

      // 3. 종모양 알림(In-App 웹 알림)은 항상 생성하여 기록 보존 (토스 회원이든 아니든 웹 알림함에 표시)
      if (loginUserId) {
        console.log(`[NotificationService] Registering in-app web notification for user ${loginUserId}`);
        
        await prisma.notification.create({
          data: {
            userId: loginUserId,
            title: useCase === NotificationUseCase.RENT_DUE ? '청구서 알림' : '알림',
            message: messageContent,
            link: '/payment'
          }
        });

        // 최종 채널 로그 설정: 토스 푸시 성공 시 'TOSS_PUSH', 실패 혹은 일반회원 시 'IN_APP_WEB'
        const finalChannel = tossSent ? 'TOSS_PUSH' : 'IN_APP_WEB';
        await this.logger.updateStatus(logEntry.id, 'SENT', finalChannel);
        return true;
      } else {
        // 초대 코드를 통해 가입하지 않은 세입자의 경우, 전화번호로 발송해야 하지만 
        // 카카오톡/SMS 발급이 강제로 배제되었으므로 발송 실패 처리
        const reason = 'Tenant has no login account (not a Toss user and cannot receive in-app web notifications)';
        console.warn(`[NotificationService] ${reason}`);
        await this.logger.updateStatus(logEntry.id, 'FAILED', 'UNKNOWN', reason);
        return false;
      }

    } catch (error: any) {
      console.error(`[NotificationService] Unexpected error occurred: ${error.message}`);
      await this.logger.updateStatus(
        logEntry.id, 
        'FAILED', 
        'UNKNOWN',
        `Process failed with exception. Error: ${error.message}`
      );
      return false;
    }
  }
}
