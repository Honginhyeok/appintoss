import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

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

    const newNotif = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title,
        message,
        link
      }
    });

    res.json({ success: true, notification: newNotif });
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
