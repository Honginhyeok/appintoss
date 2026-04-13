import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();

// ==========================================
// Announcements (공지사항)
// ==========================================

// GET /api/board/announcements - Get announcements
router.get('/announcements', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    let landlordId = req.user.id;

    if (req.user.role === 'TENANT') {
      // If tenant, get the landlord id from DB
      const me = await prisma.user.findUnique({ where: { id: req.user.id } });
      landlordId = me?.landlordId || '';
    }

    const announcements = await prisma.announcement.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(announcements);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/board/announcements - Create announcement (Landlord only)
router.post('/announcements', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    const { title, content, targetType, targetRooms } = req.body;
    if (!title || !content) return res.status(400).json({ error: '제목과 내용을 입력하세요.' });

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        // Prisma schema 상 아직 필드가 없다면, 추후 마이그레이션이 필요하지만 
        // 일단 프론트엔드가 요청한 형태로 State 배열을 반환하기 위해 임시 할당할 수도 있습니다.
        // 하지만 Prisma strict mode 때문에 스키마에 없으면 에러가 나므로, schema.prisma 업데이트도 필수입니다.
        targetType: targetType || 'ALL',
        targetRooms: Array.isArray(targetRooms) ? JSON.stringify(targetRooms) : '[]',
        landlordId: req.user.id
      }
    });

    // 프론트엔드 호환성을 위해 targetRooms를 배열로 파싱해서 리턴
    const resultToReturn = {
      ...announcement,
      targetRooms: JSON.parse(announcement.targetRooms || '[]')
    };

    res.json(resultToReturn);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/board/announcements/:id - Delete announcement (Landlord only)
router.delete('/announcements/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    
    if (!announcement || announcement.landlordId !== req.user.id) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없거나 권한이 없습니다.' });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ==========================================
// Maintenance Requests (고장/수리 문의)
// ==========================================

// GET /api/board/maintenance - Get requests
router.get('/maintenance', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role === 'TENANT') {
      // Tenants see only their own requests
      const requests = await prisma.maintenanceRequest.findMany({
        where: { tenantId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(requests);
    } else {
      // Landlord sees all requests for them
      const requests = await prisma.maintenanceRequest.findMany({
        where: { landlordId: req.user.id },
        include: { 
          tenant: { 
            select: { 
              username: true,
              name: true,
              assignedRoom: true
            } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(requests);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/board/maintenance - Create request (Tenant only)
router.post('/maintenance', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'TENANT') {
      return res.status(403).json({ error: '임차인만 접수할 수 있습니다.' });
    }
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: '제목과 내용을 입력하세요.' });

    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me || !me.landlordId) return res.status(400).json({ error: '임대인 정보를 찾을 수 없습니다.' });

    const request = await prisma.maintenanceRequest.create({
      data: {
        title,
        content,
        tenantId: req.user.id,
        landlordId: me.landlordId
      }
    });

    // --- 임대인 벨 알림 DB Insert ---
    try {
      let roomStr = '';
      if (me.roomId) {
        const room = await prisma.room.findUnique({ where: { id: me.roomId } });
        if (room) roomStr = `[${room.name}] `;
      }
      await prisma.bellNotification.create({
        data: {
          userId: me.landlordId,
          type: 'MAINTENANCE',
          message: `${roomStr}수리 문의가 접수되었습니다: "${title}"`,
          actionTab: 'maintenance'
        }
      });
    } catch (bellErr) {
      console.error('BellNotification insert error (ignored):', bellErr);
    }

    res.json(request);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/board/maintenance/:id/status - Update status (Landlord only)
router.put('/maintenance/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    const id = req.params.id as string;
    const { status } = req.body; // PENDING | IN_PROGRESS | RESOLVED

    const request = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!request || request.landlordId !== req.user.id) {
      return res.status(404).json({ error: '요청을 찾을 수 없거나 권한이 없습니다.' });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status }
    });

    // --- 세입자(작성자)에게 벨 알림 (임대인 본인에게는 절대 X) ---
    const STATUS_LABELS: Record<string, string> = {
      PENDING: '대기중',
      IN_PROGRESS: '처리중',
      RESOLVED: '완료됨'
    };
    try {
      // 세입자 User에서 방 이름 조회
      const tenantUser = await prisma.user.findUnique({ where: { id: request.tenantId } });
      let roomStr = '';
      if (tenantUser?.roomId) {
        const room = await prisma.room.findUnique({ where: { id: tenantUser.roomId } });
        if (room) roomStr = `[${room.name}] `;
      }

      await prisma.bellNotification.create({
        data: {
          userId: request.tenantId, // 수신자 = 세입자
          type: 'MAINTENANCE',
          message: `${roomStr}요청하신 수리 문의가 '${STATUS_LABELS[status] || status}'(으)로 변경되었습니다.`,
          actionTab: 'maintenance'
        }
      });
    } catch (bellErr) {
      console.error('BellNotification insert error (ignored):', bellErr);
    }

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
