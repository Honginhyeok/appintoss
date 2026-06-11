import { Router } from 'express';
import { prisma } from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * 특정 임대인에 대한 AI 브리핑을 생성하고 DB에 Upsert하는 헬퍼 함수
 */
async function generateBriefingForLandlord(hostId: string, today: string): Promise<string> {
  const thisMonth = today.substring(0, 7); // YYYY-MM
  const currentDay = new Date().getDate();

  // 데이터 수집
  const tenants = await prisma.tenant.findMany({
    where: { userId: hostId }
  });
  
  const transactions = await prisma.transaction.findMany({
    where: { 
      userId: hostId,
      type: 'INCOME',
      date: { gte: new Date(thisMonth + '-01') }
    }
  });

  // (1) 미납 세입자
  const unpaidTenants = tenants.filter(t => {
    if (!t.rentAmount) return false;
    const rentTxs = transactions.filter(tx => tx.category === 'RENT' && tx.description?.includes(t.name));
    if (rentTxs.length > 0) return false; // 납부 완료
    const payDay = t.rentPaymentDay || 25;
    return currentDay > payDay; // 미납 상태
  });

  // (2) 신규 민원 (PENDING 상태)
  const newMaintenances = await prisma.maintenanceRequest.findMany({
    where: { landlordId: hostId, status: 'PENDING' }
  });

  // (3) 계약 만료 임박 (30일 이내)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringTenants = tenants.filter(t => {
    const end = t.customRentEndDate || t.moveOutDate;
    if (!end) return false;
    return new Date(end) <= thirtyDaysFromNow && new Date(end) >= new Date();
  });

  // (4) 미가입 세입자
  const unjoinedTenants = tenants.filter(t => !t.loginUserId);

  // (5) 승인 대기 결제
  const pendingPayments = await prisma.paymentRequest.findMany({
    where: { landlordId: hostId, status: 'PENDING' }
  });

  // (6) 진행 중인 민원
  const inProgressMaintenances = await prisma.maintenanceRequest.findMany({
    where: { landlordId: hostId, status: 'IN_PROGRESS' }
  });

  // 최적화된 페이로드 조립
  const payload: any = {};
  if (unpaidTenants.length > 0) payload.unpaid = unpaidTenants.map(t => ({ name: t.name, room: t.roomId, amount: t.rentAmount }));
  if (newMaintenances.length > 0) payload.newRequests = newMaintenances.map(m => ({ title: m.title }));
  if (expiringTenants.length > 0) payload.expiring = expiringTenants.map(t => ({ name: t.name, endDate: t.customRentEndDate || t.moveOutDate }));
  if (unjoinedTenants.length > 0) payload.unjoinedCount = unjoinedTenants.length;
  if (pendingPayments.length > 0) payload.pendingPayments = pendingPayments.length;
  if (inProgressMaintenances.length > 0) payload.inProgressRequests = inProgressMaintenances.map(m => ({ title: m.title }));

  // 특이사항이 전혀 없는 경우
  if (Object.keys(payload).length === 0) {
    const text = "오늘은 챙기실 특이사항이 없습니다. 평화로운 하루 되세요! ☕";
    await prisma.dailyBriefing.upsert({
      where: {
        date_hostId: {
          date: today,
          hostId: hostId
        }
      },
      update: { content: text },
      create: {
        date: today,
        hostId: hostId,
        content: text
      }
    });
    return text;
  }

  // LLM 호출하여 브리핑 생성
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `당신은 임대인(사장님)을 돕는 유능하고 친절한 비서입니다. '~입니다', '~해 보세요' 등 정중하고 부드러운 톤으로 다음 항목들을 브리핑해 주세요.
오늘 챙겨야 할 데이터(항목이 없으면 없는 것입니다):
${JSON.stringify(payload)}

요청사항: 
1. 첫 인사는 친근하고 활기차게 시작해 주세요. (예: 사장님, 좋은 아침입니다!)
2. 데이터가 있는 항목들만 불릿 포인트(-)로 간결하게 브리핑해 주세요.
3. 숫자를 강조해서 오늘 꼭 해야 할 일이라는 느낌을 주세요.
4. 마무리는 응원의 메시지로 끝내 주세요.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // 토큰 사용량 기록
  const usage = result.response.usageMetadata;
  if (usage) {
    await prisma.aiTokenUsage.create({
      data: {
        date: today,
        hostId: hostId,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0
      }
    });
  }

  // DB에 최종 Upsert (기존 요약 덮어쓰기)
  await prisma.dailyBriefing.upsert({
    where: {
      date_hostId: {
        date: today,
        hostId: hostId
      }
    },
    update: { content: responseText },
    create: {
      date: today,
      hostId: hostId,
      content: responseText
    }
  });

  return responseText;
}

/**
 * GET /api/host/daily-briefing
 * 대시보드 진입 시 캐싱된 당일 브리핑 로드 (초고속 0ms 대응)
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user.id;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD

    // 1. 이미 빌드된 오늘의 브리핑이 존재하면 즉시 반환
    const existing = await prisma.dailyBriefing.findUnique({
      where: {
        date_hostId: {
          date: today,
          hostId: userId,
        }
      }
    });

    if (existing) {
      return res.json({ text: existing.content });
    }

    // 2. 만약 오늘 가입했거나 배치가 비정상 누락되어 없는 특이 케이스인 경우 실시간 생성 폴백 실행
    console.log(`[GET Briefing] Cache miss for user ${userId} on ${today}. Generating real-time...`);
    const generatedText = await generateBriefingForLandlord(userId, today);
    return res.json({ text: generatedText });

  } catch (error: any) {
    console.error('[GET Briefing] Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /api/host/daily-briefing/batch-generate
 * 구글 클라우드 스케줄러를 통한 매일 3회 비동기 일괄 브리핑 생성 크론 잡
 */
router.post('/batch-generate', async (req: any, res: any) => {
  try {
    const secretHeader = req.headers['x-batch-secret-key'];
    const expectedSecret = process.env.BATCH_SECRET_KEY;

    if (!expectedSecret || secretHeader !== expectedSecret) {
      console.warn('[Batch Briefing] Unauthorized attempt to run batch.');
      return res.status(401).json({ message: 'Unauthorized: Invalid Batch Secret Key.' });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD
    console.log(`[Batch Briefing] Started batch pre-generation for ${today}...`);

    // 모든 활성 상태인 임대인 조회
    const landlords = await prisma.user.findMany({
      where: {
        roles: { has: 'LANDLORD' },
        status: 'ACTIVE'
      }
    });

    let successCount = 0;
    const errors: Array<{ hostId: string; error: string }> = [];

    // 임대인 별 순차적 생성 (비동기 루프 제어)
    for (const landlord of landlords) {
      try {
        await generateBriefingForLandlord(landlord.id, today);
        successCount++;
      } catch (err: any) {
        console.error(`[Batch Briefing] Failed for landlord ${landlord.id}:`, err.message);
        errors.push({ hostId: landlord.id, error: err.message });
      }
    }

    console.log(`[Batch Briefing] Completed. Success: ${successCount}/${landlords.length}, Failures: ${errors.length}`);
    return res.json({
      success: true,
      message: '배치 처리가 성공적으로 실행되었습니다.',
      totalTargets: landlords.length,
      successCount,
      failures: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Batch Briefing] Global Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
