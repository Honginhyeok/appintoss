import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();

// ─── PREMIUM UPGRADE (USER TIER) ──────────────────────────────────
router.post('/upgrade', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { orderId, subscriptionId } = req.body;
    
    await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: true, subscriptionTier: 'PREMIUM', tossSubscriptionId: subscriptionId }
    });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TOSS IAP WEBHOOK (SUBSCRIPTION EVENTS) ───────────────────────
router.post('/toss/webhook/subscription', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[TOSS IAP WEBHOOK] Received subscription event:', payload);
    
    const subscriptionId = payload.subscriptionId || payload.data?.subscriptionId;
    const status = payload.status || payload.data?.status || payload.eventType;

    if (subscriptionId) {
      // 구독 해지, 만료, 정지 등의 상태일 경우
      if (status === 'EXPIRED' || status === 'CANCELED' || status === 'TERMINATED' || status === 'SUBSCRIPTION_CANCELED' || status === 'SUBSCRIPTION_EXPIRED') {
        await prisma.user.updateMany({
          where: { tossSubscriptionId: subscriptionId },
          data: { isSubscribed: false }
        });
        console.log(`[TOSS IAP WEBHOOK] Subscription ${subscriptionId} cancelled/expired.`);
      } 
      // 구독 갱신, 결제 성공 등 활성 상태일 경우
      else if (status === 'ACTIVE' || status === 'SUCCESS' || status === 'RENEWED' || status === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
        await prisma.user.updateMany({
          where: { tossSubscriptionId: subscriptionId },
          data: { isSubscribed: true }
        });
        console.log(`[TOSS IAP WEBHOOK] Subscription ${subscriptionId} renewed/active.`);
      }
    }
    
    // 웹훅 수신 성공 응답 (200 OK 반환해야 토스가 재시도하지 않음)
    res.status(200).send('OK');
  } catch (e: any) {
    console.error('[TOSS IAP WEBHOOK] Error:', e);
    res.status(200).send('Error but acknowledged');
  }
});

// ─── USER MANAGEMENT (ADMIN ONLY & SELF) ───────────────────────────

// Set PIN/Password for currently logged in user
router.put('/me/password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: '비밀번호를 입력하세요' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, plainPassword: password }
    });
    res.json({ success: true, message: '비밀번호가 성공적으로 설정되었습니다.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.use(authenticateToken, requireAdmin);

// List all users
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, name: true, username: true, roles: true, status: true, createdAt: true, plainPassword: true,
        isSubscribed: true, subscriptionTier: true,
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
        roles: [role || 'USER'], 
        status: 'ACTIVE' 
      },
      select: { id: true, username: true, roles: true, status: true, createdAt: true, plainPassword: true }
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

// Toggle subscription status (admin)
router.put('/:id/subscription', async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { isSubscribed } = req.body;
    
    await prisma.user.update({ 
      where: { id }, 
      data: { isSubscribed, subscriptionTier: isSubscribed ? 'PREMIUM' : 'FREE' } 
    });
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

    await prisma.user.update({ where: { id }, data: { roles: [role] } });
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
    if (!user || !user.roles.includes('TENANT')) {
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
