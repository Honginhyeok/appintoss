import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const data = {
      ...req.body,
      userId,
      amount: parseFloat(req.body.amount),
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };
    const transaction = await prisma.transaction.create({ data });
    res.json(transaction);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const data = {
      ...req.body,
      amount: parseFloat(req.body.amount),
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };
    const transaction = await prisma.transaction.update({ where: { id: String(req.params.id), userId }, data });
    res.json(transaction);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    await prisma.transaction.delete({ where: { id: String(req.params.id), userId } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
