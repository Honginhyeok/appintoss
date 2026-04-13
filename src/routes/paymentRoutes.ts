import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';
import webpush from '../config/vapid';

const router = Router();

// 카테고리 한글 매핑
const CATEGORY_LABELS: Record<string, string> = {
  RENT: '월세',
  MAINTENANCE_FEE: '관리비',
  REPAIR: '수리비용',
  DEPOSIT: '보증금',
  OTHER: '기타'
};

// GET /api/payments - List requests
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role === 'TENANT') {
      const requests = await prisma.paymentRequest.findMany({
        where: { tenantUserId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(requests);
    } else {
      const requests = await prisma.paymentRequest.findMany({
        where: { landlordId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });

      // Attach tenant info + room info
      const withUsers = await Promise.all(requests.map(async r => {
        const u = await prisma.user.findUnique({
          where: { id: r.tenantUserId },
          include: { assignedRoom: true }
        });
        
        return {
          ...r,
          user: u
        };
      }));

      return res.json(withUsers);
    }
  } catch (e: any) {
    console.error('Prisma Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments - Request confirmation (세입자 → 입금 확인 요청)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'TENANT') {
      return res.status(403).json({ error: '임차인만 요청할 수 있습니다.' });
    }

    const { category, amount, memo } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ error: '카테고리와 금액을 입력하세요.' });
    }

    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me || !me.landlordId) return res.status(400).json({ error: '임대인 정보가 없습니다. 관리자에게 문의하세요.' });

    // Grab physical tenant info
    const tenantRecord = await prisma.tenant.findUnique({ where: { loginUserId: me.id } });
    const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;

    const request = await prisma.paymentRequest.create({
      data: {
        tenantUserId: me.id,
        landlordId: me.landlordId,
        tenantRecordId: tenantRecord?.id || null,
        category: category || 'RENT',
        amount: parsedAmount,
        memo: memo || null
      }
    });

    // --- 알림 메시지 빌드 ---
    let roomStr = '';
    const tenantName = me.name || me.username;
    if (tenantRecord?.roomId) {
      const r = await prisma.room.findUnique({ where: { id: tenantRecord.roomId } });
      if (r) roomStr = `[${r.name}] `;
    }
    const categoryLabel = CATEGORY_LABELS[category] || category;
    const notifMessage = `${roomStr}${tenantName}님이 ${categoryLabel} ${parsedAmount.toLocaleString()}원에 대한 입금 확인을 요청했습니다.`;

    // --- NotificationLog(DB) Insert ---
    try {
      await prisma.notificationLog.create({
        data: {
          tenantId: me.id,
          useCase: 'PAYMENT_CONFIRM',
          channel: 'PUSH',
          status: 'SENT',
          sentAt: new Date(),
          content: notifMessage
        }
      });
    } catch (logErr) {
      console.error('NotificationLog insert error (ignored):', logErr);
    }

    // --- 임대인 벨 알림 DB Insert ---
    try {
      await prisma.bellNotification.create({
        data: {
          userId: me.landlordId!,
          type: 'PAYMENT',
          message: notifMessage,
          actionTab: 'payments'
        }
      });
    } catch (bellErr) {
      console.error('BellNotification insert error (ignored):', bellErr);
    }

    // --- Web Push 알림 → 임대인 ---
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: me.landlordId }
      });

      const payload = JSON.stringify({
        title: '💰 입금 확인 요청',
        body: notifMessage
      });

      for (const sub of subscriptions) {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload).catch(err => console.error('Push error:', err));
      }
    } catch (pushErr) {
      console.error('Push fail ignored:', pushErr);
    }

    res.json({ ...request, notifMessage });
  } catch (e: any) {
    console.error('Prisma Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments/:id/approve - Approve and auto-create rent transaction
router.post('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const id = req.params.id as string;
    const request = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!request || request.landlordId !== req.user.id) {
      return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
    }
    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: '이미 승인된 요청입니다.' });
    }

    // 1. Mark approved
    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    // 2. Create Transaction (카테고리 매핑)
    let roomId = null;
    let descName = '임차인';
    if (request.tenantRecordId) {
      const tRec = await prisma.tenant.findUnique({ where: { id: request.tenantRecordId } });
      if (tRec) {
        roomId = tRec.roomId;
        descName = tRec.name;
      }
    } else {
      const uRec = await prisma.user.findUnique({ where: { id: request.tenantUserId } });
      if (uRec) descName = uRec.name || uRec.username;
    }

    const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
    const txCategory = request.category === 'MAINTENANCE_FEE' ? 'MAINTENANCE' : request.category === 'REPAIR' ? 'MAINTENANCE' : request.category;

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        roomId,
        type: 'INCOME',
        category: txCategory,
        amount: request.amount,
        description: `${descName} 입금확인(${categoryLabel})${request.memo ? ' - ' + request.memo : ''}`,
        date: new Date()
      }
    });

    // --- 세입자에게 벨 알림 (임대인 본인 X) ---
    try {
      const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
      await prisma.bellNotification.create({
        data: {
          userId: request.tenantUserId, // 수신자 = 세입자
          type: 'PAYMENT',
          message: `입금 확인 요청(${categoryLabel} ${request.amount.toLocaleString()}원)이 승인되었습니다. ✅`,
          actionTab: 'payments'
        }
      });
    } catch (bellErr) {
      console.error('BellNotification insert error (ignored):', bellErr);
    }

    res.json({ success: true, transaction });
  } catch (e: any) {
    console.error('Prisma Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments/:id/reject - Reject request
router.post('/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') return res.status(403).json({ error: '권한이 없습니다.' });
    const id = req.params.id as string;
    const request = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!request || request.landlordId !== req.user.id) return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });

    await prisma.paymentRequest.update({ where: { id }, data: { status: 'REJECTED' } });

    // --- 세입자에게 벨 알림 (임대인 본인 X) ---
    try {
      const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
      await prisma.bellNotification.create({
        data: {
          userId: request.tenantUserId, // 수신자 = 세입자
          type: 'PAYMENT',
          message: `입금 확인 요청(${categoryLabel} ${request.amount.toLocaleString()}원)이 거절되었습니다.`,
          actionTab: 'payments'
        }
      });
    } catch (bellErr) {
      console.error('BellNotification insert error (ignored):', bellErr);
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('Prisma Error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
