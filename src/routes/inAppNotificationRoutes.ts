import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { NotificationService } from '../services/NotificationService';
import { KakaoAlimTalkProvider } from '../providers/KakaoAlimTalkProvider';
import { SMSProvider } from '../providers/SMSProvider';
import { PrismaLogger } from '../services/PrismaLogger';
import { NotificationUseCase } from '../domain/NotificationTemplate';

const router = Router();
router.use(authenticateToken);

const kakao = new KakaoAlimTalkProvider();
const sms = new SMSProvider();
const logger = new PrismaLogger();
const notificationService = new NotificationService(kakao, sms, logger);

// GET /api/in-app-notifications — 자신의 알림 조회
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    let roleFilter: any = {};
    if (req.user.currentRole === 'LANDLORD') {
      // 임대인 모드일 때는 자신이 임차인으로서 받은 청구서 알림을 가림
      roleFilter = { NOT: { title: { contains: '청구서' } } };
    } else if (req.user.currentRole === 'TENANT') {
      // 임차인 모드일 때는 임대인 전용 알림을 가림 (추후 확장 대비)
      roleFilter = { NOT: { title: { contains: '입금' } } };
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, ...roleFilter },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (e: any) {
    console.error('In-App notification fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/in-app-notifications — 임대인이 세입자에게 알림 전송
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { targetUserId, title, message, link } = req.body;
    
    // 권한 체크: 임대인 또는 어드민만 발송 가능하도록 허용
    const userRoles: string[] = req.user.roles || [];
    if (req.user.currentRole !== 'LANDLORD' && !userRoles.includes('ADMIN')) {
      return res.status(403).json({ error: '임대인 권한이 필요합니다.' });
    }

    if (!targetUserId || !title || !message) {
      return res.status(400).json({ error: '필수 값이 부족합니다.' });
    }

    // 1. 해당 유저에 대응되는 물리적인 Tenant 레코드 조회
    const tenant = await prisma.tenant.findUnique({
      where: { loginUserId: targetUserId },
      include: { room: true }
    });

    if (!tenant) {
      // 대응되는 Tenant가 없으면 직접 웹 알림만 생성 (구형 세입자 또는 비매핑 계정)
      const newNotif = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title,
          message,
          link
        }
      });
      return res.json({ success: true, notification: newNotif });
    }

    // 2. 통합 알림 서비스(NotificationService)를 호출하여 발송 진행
    // RENT_DUE(월세 청구서) 템플릿에 맞추어 변수 데이터 생성
    const isPaymentUseCase = title?.includes('청구서') || message?.includes('월세');
    const useCase = isPaymentUseCase ? NotificationUseCase.RENT_DUE : NotificationUseCase.RENT_DUE;

    const data = {
      tenantName: tenant.name,
      roomName: tenant.room?.name || '미배정',
      amount: tenant.rentAmount ? tenant.rentAmount.toLocaleString('ko-KR') : '0',
      dueDate: tenant.rentPaymentDay ? `매월 ${tenant.rentPaymentDay}일` : '-',
      endDate: tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : '-',
      requestDetails: message
    };

    const success = await notificationService.sendNotification({
      to: tenant.phone || '',
      tenantId: tenant.id,
      useCase,
      data,
      isManual: true
    });

    res.json({ success, message: '알림이 성공적으로 처리되었습니다.' });
  } catch (e: any) {
    console.error('In-App notification send error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/in-app-notifications/:id/read — 읽음 처리
router.patch('/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user.id) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error('In-App notification update error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/in-app-notifications/read-all — 모두 읽음 처리
router.patch('/read-all/batch', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
