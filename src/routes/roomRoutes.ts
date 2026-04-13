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
