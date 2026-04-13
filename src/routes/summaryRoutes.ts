import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const [rooms, transactions, tenants] = await Promise.all([
      prisma.room.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.tenant.count({ where: { userId } }),
    ]);

    const totalIncome = transactions.filter((t: any) => t.type === 'INCOME').reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const vacantRooms = rooms.filter((r: any) => r.status === 'VACANT').length;
    const occupiedRooms = rooms.filter((r: any) => r.status === 'OCCUPIED').length;

    res.json({ totalIncome, totalExpense, netProfit, totalRooms: rooms.length, vacantRooms, occupiedRooms, totalTenants: tenants });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
