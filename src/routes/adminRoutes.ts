import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Protect all admin routes
router.use(authenticateToken, requireAdmin);

// Get rooms belonging to a specific landlord (for assignment dropdowns)
router.get('/rooms/:landlordId', async (req, res) => {
  try {
    const landlordId = String(req.params.landlordId);
    if (!landlordId || landlordId === 'undefined') return res.json([]);

    const rooms = await prisma.room.findMany({
      where: { userId: landlordId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    
    res.json(rooms);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Backup only — keep this for data export
router.get('/backup', async (_req, res) => {
  try {
    const [users, rooms, tenants, transactions] = await Promise.all([
      (prisma as any).user.findMany({
        select: { id: true, username: true, role: true, status: true, plainPassword: true, createdAt: true }
      }),
      (prisma as any).room.findMany(),
      (prisma as any).tenant.findMany(),
      (prisma as any).transaction.findMany(),
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      version: '2.0',
      description: '호스텔 관리 시스템 데이터 백업',
      data: { users, rooms, tenants, transactions }
    });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
