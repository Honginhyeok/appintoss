import { Router } from 'express';
import { loginWithToss, unlinkToss, handleTossCallback, completeTossRegistration } from '../controllers/tossAuthController';

const router = Router();

// 1. 토스 인가 코드(Auth Code) 수신 및 엑세스 토큰 발급, 유저 로그인 처리
router.post('/login', loginWithToss);

// 1-b. 토스 최초 로그인 시 추가 정보(초대코드/전화번호) 입력 후 가입 완료
router.post('/complete-registration', completeTossRegistration);

// 2. 토스 웹 간편 로그인 콜백 리다이렉트 처리
router.get('/callback', handleTossCallback);

// 3. 토스 앱에서 "연결 끊기" 발생 시 수신하는 콜백 웹훅
router.post('/unlink', unlinkToss);

// 임시 테스트용 토스 테스트 유저 정리 API
router.get('/clean-test-users', async (req, res) => {
  try {
    const { prisma } = require('../config/db');
    
    // 1. 가져오기
    const targetUsers = await prisma.user.findMany({
      where: {
        username: {
          startsWith: 'toss_'
        },
        NOT: [
          { username: 'toss_wjsdudtns' },
          { username: 'wjsdudtns' },
          { username: 'admin' },
          { roles: { has: 'ADMIN' } }
        ]
      },
      select: { id: true }
    });

    const userIds = targetUsers.map((u: any) => u.id);
    if (userIds.length === 0) {
      return res.json({ success: true, message: "No Toss test users to delete." });
    }

    // 2. 하위 관계 데이터 일괄 삭제
    // 2-1. PushSubscription 삭제
    await prisma.pushSubscription.deleteMany({
      where: { userId: { in: userIds } }
    });
    
    // 2-2. Comment 삭제
    await prisma.comment.deleteMany({
      where: { authorId: { in: userIds } }
    });

    // 2-3. Post 삭제 (Cascade)
    await prisma.post.deleteMany({
      where: { authorId: { in: userIds } }
    });

    // 2-4. MaintenanceRequest 삭제
    await prisma.maintenanceRequest.deleteMany({
      where: {
        OR: [
          { tenantId: { in: userIds } },
          { landlordId: { in: userIds } }
        ]
      }
    });

    // 2-5. Announcement 삭제
    await prisma.announcement.deleteMany({
      where: { landlordId: { in: userIds } }
    });

    // 2-6. Invitation 삭제
    await prisma.invitation.deleteMany({
      where: {
        OR: [
          { landlordId: { in: userIds } },
          { usedBy: { in: userIds } }
        ]
      }
    });

    // 2-7. Transaction 삭제
    await prisma.transaction.deleteMany({
      where: { userId: { in: userIds } }
    });

    // 2-8. Tenant 정보 정리
    await prisma.tenant.updateMany({
      where: { loginUserId: { in: userIds } },
      data: { loginUserId: null }
    });
    await prisma.tenant.deleteMany({
      where: { userId: { in: userIds } }
    });

    // 2-9. Room 정보 정리
    await prisma.room.updateMany({
      where: { userId: { in: userIds } },
      data: { userId: null }
    });
    await prisma.room.deleteMany({
      where: { userId: { in: userIds } }
    });

    // 3. User 본체 삭제
    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });

    return res.json({
      success: true,
      message: `Successfully deleted ${result.count} Toss test users and their relational data.`
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
