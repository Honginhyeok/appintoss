import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { NotificationService } from '../services/NotificationService';
import { KakaoAlimTalkProvider } from '../providers/KakaoAlimTalkProvider';
import { SMSProvider } from '../providers/SMSProvider';
import { PrismaLogger } from '../services/PrismaLogger';
import { NotificationUseCase } from '../domain/NotificationTemplate';
import { prisma } from '../config/db';

const router = Router();
router.use(authenticateToken);

const kakao = new KakaoAlimTalkProvider();
const sms = new SMSProvider();
const logger = new PrismaLogger();
const notificationService = new NotificationService(kakao, sms, logger);

// 템플릿 한글 매핑
const TEMPLATE_LABELS: Record<string, string> = {
  RENT_DUE: '월세 납부 안내',
  OVERDUE_PAYMENT: '월세 미납 경고',
  CONTRACT_ENDING: '계약 만료 안내',
  MAINTENANCE_REQUEST_RECEIVED: '유지보수 접수 확인',
  MAINTENANCE_COMPLETED: '유지보수 완료 알림'
};

router.get('/logs', async (_req, res) => {
  try {
    const logs = await logger.getLogs();
    res.json(logs);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/notify — 체크박스 기반 방 선택 일괄 발송
router.post('/notify', async (req: AuthenticatedRequest, res) => {
  try {
    const { targetType, roomIds, template } = req.body;
    const landlordId = req.user.id;

    if (!template) return res.status(400).json({ error: '알림 템플릿을 선택하세요.' });

    // 0. 결제 관련 템플릿일 경우 정산 계좌 필수 체크
    const paymentTemplates = ['RENT_DUE', 'OVERDUE_PAYMENT'];
    if (paymentTemplates.includes(template)) {
      const landlord = await prisma.user.findUnique({ where: { id: landlordId } });
      if (!landlord?.settlementAccount || !landlord?.settlementBank || !landlord?.settlementName) {
        return res.status(400).json({ error: '정산 계좌가 등록되지 않아 결제 알림을 발송할 수 없습니다.' });
      }
    }

    // 1. 대상 방 목록 결정
    let targetRoomIds: string[] = [];

    if (targetType === 'SPECIFIC' && Array.isArray(roomIds) && roomIds.length > 0) {
      targetRoomIds = roomIds;
    } else {
      // ALL: 현재 임대인 소유의 모든 방
      const allRooms = await prisma.room.findMany({
        where: { userId: landlordId }
      });
      targetRoomIds = allRooms.map(r => r.id);
    }

    if (targetRoomIds.length === 0) {
      return res.status(400).json({ error: '발송 대상 방이 없습니다.' });
    }

    // 2. 해당 방에 매핑된 세입자(Tenant 레코드) 조회 — 빈 방 자동 필터
    const tenantsInRooms = await prisma.tenant.findMany({
      where: {
        roomId: { in: targetRoomIds },
        NOT: { phone: '' }
      }
    });

    if (tenantsInRooms.length === 0) {
      return res.status(400).json({ error: '선택된 방에 세입자가 없습니다. 빈 방은 발송에서 제외됩니다.' });
    }

    // 3. 각 세입자에게 알림 발송
    let sentCount = 0;
    const templateLabel = TEMPLATE_LABELS[template] || template;
    const errors: string[] = [];

    for (const tenant of tenantsInRooms) {
      try {
        // 방 이름 조회
        let roomName = '';
        if (tenant.roomId) {
          const room = await prisma.room.findUnique({ where: { id: tenant.roomId } });
          if (room) roomName = room.name;
        }

        const success = await notificationService.sendNotification({
          to: tenant.phone!,
          tenantId: tenant.id,
          useCase: template as NotificationUseCase,
          data: {
            tenantName: tenant.name,
            roomName,
            amount: tenant.rentAmount ? tenant.rentAmount.toLocaleString() : '0',
            dueDate: tenant.rentPaymentDay ? `매월 ${tenant.rentPaymentDay}일` : '-',
            endDate: tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : '-',
            requestDetails: `${templateLabel} (${roomName || '방 미지정'})`
          },
          isManual: true
        });

        if (success) sentCount++;
      } catch (sendErr) {
        console.error(`Failed to send to ${tenant.name}:`, sendErr);
        errors.push(tenant.name);
      }
    }

    res.json({
      success: true,
      sentCount,
      totalTargets: tenantsInRooms.length,
      failedNames: errors.length > 0 ? errors : undefined
    });
  } catch (e: any) {
    console.error('Notification Error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
