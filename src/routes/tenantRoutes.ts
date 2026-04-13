import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const tenants = await prisma.tenant.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tenants);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const data = {
      ...req.body,
      userId,
      moveInDate: req.body.moveInDate ? new Date(req.body.moveInDate) : null,
      moveOutDate: req.body.moveOutDate ? new Date(req.body.moveOutDate) : null,
      deposit: req.body.deposit ? parseFloat(req.body.deposit) : null,
      rentType: req.body.rentType || 'MONTHLY',
      rentAmount: req.body.rentAmount ? parseFloat(req.body.rentAmount) : null,
      rentPaymentDay: req.body.rentPaymentDay ? parseInt(req.body.rentPaymentDay, 10) : null,
      customRentStartDate: req.body.customRentStartDate ? new Date(req.body.customRentStartDate) : null,
      customRentEndDate: req.body.customRentEndDate ? new Date(req.body.customRentEndDate) : null,
      phone: req.body.phone ? String(req.body.phone).replace(/[^0-9]/g, '') : null,
    };
    // Ensure monthlyRent isn't accidentally pushed
    delete data.monthlyRent;

    const tenant = await prisma.tenant.create({ data });
    // Update room status to OCCUPIED
    if (data.roomId) {
      await prisma.room.update({ where: { id: String(data.roomId) }, data: { status: 'OCCUPIED' } });
    }
    res.json(tenant);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const data = {
      ...req.body,
      moveInDate: req.body.moveInDate ? new Date(req.body.moveInDate) : null,
      moveOutDate: req.body.moveOutDate ? new Date(req.body.moveOutDate) : null,
      deposit: req.body.deposit ? parseFloat(req.body.deposit) : null,
      rentType: req.body.rentType || 'MONTHLY',
      rentAmount: req.body.rentAmount ? parseFloat(req.body.rentAmount) : null,
      rentPaymentDay: req.body.rentPaymentDay ? parseInt(req.body.rentPaymentDay, 10) : null,
      customRentStartDate: req.body.customRentStartDate ? new Date(req.body.customRentStartDate) : null,
      customRentEndDate: req.body.customRentEndDate ? new Date(req.body.customRentEndDate) : null,
      phone: req.body.phone ? String(req.body.phone).replace(/[^0-9]/g, '') : null,
    };
    delete data.monthlyRent;

    const tenant = await prisma.tenant.update({ where: { id: String(req.params.id), userId }, data });
    res.json(tenant);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const tenant = await prisma.tenant.findUnique({ where: { id: String(req.params.id) } });
    await prisma.tenant.delete({ where: { id: String(req.params.id), userId } });
    
    // If this was the last tenant in the room, set room to VACANT
    if (tenant?.roomId) {
      const remaining = await prisma.tenant.count({ where: { roomId: tenant.roomId } });
      if (remaining === 0) {
        await prisma.room.update({ where: { id: String(tenant.roomId) }, data: { status: 'VACANT' } });
      }
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
