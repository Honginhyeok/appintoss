import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();

// ─── USER MANAGEMENT (ADMIN ONLY) ──────────────────────────────────
router.use(authenticateToken, requireAdmin);

// List all users
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, name: true, username: true, role: true, status: true, createdAt: true, plainPassword: true,
        landlord: { select: { id: true, name: true, username: true } },
        assignedRoom: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(users);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create user (admin bypass — directly ACTIVE)
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: '이미 존재하는 아이디입니다' });

    // 임차인의 경우 비밀번호가 비어있을 수 있으므로 예외 처리
    const finalPassword = (role === 'TENANT' && !password) ? 'NO_PASSWORD' : password;
    if (!finalPassword) return res.status(400).json({ error: '비밀번호를 입력하세요' });

    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    const user = await prisma.user.create({
      data: { 
        username, 
        password: hashedPassword, 
        plainPassword: role === 'TENANT' ? null : finalPassword, 
        role: role || 'USER', 
        status: 'ACTIVE' 
      },
      select: { id: true, username: true, role: true, status: true, createdAt: true, plainPassword: true }
    });
    res.json(user);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Delete user
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    if (req.user?.id === id) return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다' });

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (userToDelete?.username === 'admin') return res.status(400).json({ error: '기본 관리자 계정은 삭제할 수 없습니다' });

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Reset password (admin)
router.put('/:id/password', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: '비밀번호를 입력하세요' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword, plainPassword: password } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Change user status (approve / suspend)
router.put('/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다' });
    }
    if (req.user?.id === id) return res.status(400).json({ error: '자기 자신의 상태는 변경할 수 없습니다' });

    await prisma.user.update({ where: { id }, data: { status } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Change user role
router.put('/:id/role', async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { role } = req.body;
    if (!['ADMIN', 'USER', 'TENANT', 'LANDLORD'].includes(role)) {
      return res.status(400).json({ error: '유효하지 않은 역할입니다' });
    }
    if (req.user?.id === id) return res.status(400).json({ error: '자기 자신의 역할은 변경할 수 없습니다' });

    await prisma.user.update({ where: { id }, data: { role } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Assign tenant to landlord and room
router.put('/:id/assign', async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { landlordId, roomId } = req.body;
    
    // Validate target user exists and is a TENANT
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'TENANT') {
      return res.status(400).json({ error: '해당 임차인을 찾을 수 없거나 권한이 올바르지 않습니다' });
    }

    await prisma.user.update({
      where: { id },
      data: { landlordId, roomId }
    });
    
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
