"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const NotificationService_1 = require("../services/NotificationService");
const KakaoAlimTalkProvider_1 = require("../providers/KakaoAlimTalkProvider");
const SMSProvider_1 = require("../providers/SMSProvider");
const PrismaLogger_1 = require("../services/PrismaLogger");
const db_1 = require("../config/db");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
const kakao = new KakaoAlimTalkProvider_1.KakaoAlimTalkProvider();
const sms = new SMSProvider_1.SMSProvider();
const logger = new PrismaLogger_1.PrismaLogger();
const notificationService = new NotificationService_1.NotificationService(kakao, sms, logger);
// 템플릿 한글 매핑
const TEMPLATE_LABELS = {
    RENT_DUE: '월세 납부 안내',
    OVERDUE_PAYMENT: '월세 미납 경고',
    CONTRACT_ENDING: '계약 만료 안내',
    MAINTENANCE_REQUEST_RECEIVED: '유지보수 접수 확인',
    MAINTENANCE_COMPLETED: '유지보수 완료 알림'
};
router.get('/logs', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield logger.getLogs();
        res.json(logs);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/notify — 체크박스 기반 방 선택 일괄 발송
router.post('/notify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetType, roomIds, template } = req.body;
        const landlordId = req.user.id;
        if (!template)
            return res.status(400).json({ error: '알림 템플릿을 선택하세요.' });
        // 0. 결제 관련 템플릿일 경우 정산 계좌 필수 체크
        const paymentTemplates = ['RENT_DUE', 'OVERDUE_PAYMENT'];
        if (paymentTemplates.includes(template)) {
            const landlord = yield db_1.prisma.user.findUnique({ where: { id: landlordId } });
            if (!(landlord === null || landlord === void 0 ? void 0 : landlord.settlementAccount) || !(landlord === null || landlord === void 0 ? void 0 : landlord.settlementBank) || !(landlord === null || landlord === void 0 ? void 0 : landlord.settlementName)) {
                return res.status(400).json({ error: '정산 계좌가 등록되지 않아 결제 알림을 발송할 수 없습니다.' });
            }
        }
        // 1. 대상 방 목록 결정
        let targetRoomIds = [];
        if (targetType === 'SPECIFIC' && Array.isArray(roomIds) && roomIds.length > 0) {
            targetRoomIds = roomIds;
        }
        else {
            // ALL: 현재 임대인 소유의 모든 방
            const allRooms = yield db_1.prisma.room.findMany({
                where: { userId: landlordId }
            });
            targetRoomIds = allRooms.map(r => r.id);
        }
        if (targetRoomIds.length === 0) {
            return res.status(400).json({ error: '발송 대상 방이 없습니다.' });
        }
        // 2. 해당 방에 매핑된 세입자(Tenant 레코드) 조회 — 빈 방 자동 필터
        const tenantsInRooms = yield db_1.prisma.tenant.findMany({
            where: {
                roomId: { in: targetRoomIds },
                NOT: { phone: '' }
            }
        });
        if (tenantsInRooms.length === 0) {
            return res.status(400).json({ error: '선택된 방에 세입자가 없습니다. 빈 방은 발송에서 제외됩니다.' });
        }
        // 3. 각 세입자에게 알림 발송
        let sentCount = 0;
        const templateLabel = TEMPLATE_LABELS[template] || template;
        const errors = [];
        for (const tenant of tenantsInRooms) {
            try {
                // 방 이름 조회
                let roomName = '';
                if (tenant.roomId) {
                    const room = yield db_1.prisma.room.findUnique({ where: { id: tenant.roomId } });
                    if (room)
                        roomName = room.name;
                }
                const success = yield notificationService.sendNotification({
                    to: tenant.phone,
                    tenantId: tenant.id,
                    useCase: template,
                    data: {
                        tenantName: tenant.name,
                        roomName,
                        amount: tenant.rentAmount ? tenant.rentAmount.toLocaleString() : '0',
                        dueDate: tenant.rentPaymentDay ? `매월 ${tenant.rentPaymentDay}일` : '-',
                        endDate: tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : '-',
                        requestDetails: `${templateLabel} (${roomName || '방 미지정'})`
                    },
                    isManual: true
                });
                if (success)
                    sentCount++;
            }
            catch (sendErr) {
                console.error(`Failed to send to ${tenant.name}:`, sendErr);
                errors.push(tenant.name);
            }
        }
        res.json({
            success: true,
            sentCount,
            totalTargets: tenantsInRooms.length,
            failedNames: errors.length > 0 ? errors : undefined
        });
    }
    catch (e) {
        console.error('Notification Error:', e);
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
