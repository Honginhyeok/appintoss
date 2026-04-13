import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const rooms = await prisma.room.findMany({
      where: { userId },
      include: { tenants: true, transactions: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(rooms);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    // 검증 로직: 프리미엄 구독자 여부 및 생성된 방 개수 확인
    const userWithRooms = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { rooms: true } } }
    });
    
    if (!userWithRooms) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    
    if (userWithRooms._count.rooms >= 3 && !userWithRooms.isSubscribed) {
      return res.status(403).json({ 
        code: 'UPGRADE_REQUIRED', 
        message: '무료 버전에서는 방을 최대 3개까지만 등록할 수 있습니다. 프리미엄 요금제로 업그레이드해 주세요.' 
      });
    }

    const room = await prisma.room.create({ data: { ...req.body, userId } });
    res.json(room);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const room = await prisma.room.update({ where: { id: String(req.params.id), userId }, data: req.body });
    res.json(room);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    await prisma.room.delete({ where: { id: String(req.params.id), userId } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
