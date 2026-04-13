import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// GET /api/bell-notifications — 7일 이내 알림 조회
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const notifications = await prisma.bellNotification.findMany({
      where: {
        userId: req.user.id,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notifications);
  } catch (e: any) {
    console.error('Bell notification fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/bell-notifications/:id — 알림 수동 삭제
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const notif = await prisma.bellNotification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user.id) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    await prisma.bellNotification.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Bell notification delete error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/bell-notifications/:id/read — 읽음 처리
router.put('/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.bellNotification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/bell-notifications/read-all — 모두 읽음 처리
router.put('/read-all/batch', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.bellNotification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
