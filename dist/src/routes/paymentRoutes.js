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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const vapid_1 = __importDefault(require("../config/vapid"));
const router = (0, express_1.Router)();
// 카테고리 한글 매핑
const CATEGORY_LABELS = {
    RENT: '월세',
    MAINTENANCE_FEE: '관리비',
    REPAIR: '수리비용',
    DEPOSIT: '보증금',
    OTHER: '기타'
};
// GET /api/payments - List requests
router.get('/', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role === 'TENANT') {
            const requests = yield db_1.prisma.paymentRequest.findMany({
                where: { tenantUserId: req.user.id },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }
        else {
            const requests = yield db_1.prisma.paymentRequest.findMany({
                where: { landlordId: req.user.id },
                orderBy: { createdAt: 'desc' }
            });
            // Attach tenant info + room info
            const withUsers = yield Promise.all(requests.map((r) => __awaiter(void 0, void 0, void 0, function* () {
                const u = yield db_1.prisma.user.findUnique({
                    where: { id: r.tenantUserId },
                    include: { assignedRoom: true }
                });
                return Object.assign(Object.assign({}, r), { user: u });
            })));
            return res.json(withUsers);
        }
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/payments - Request confirmation (세입자 → 입금 확인 요청)
router.post('/', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'TENANT') {
            return res.status(403).json({ error: '임차인만 요청할 수 있습니다.' });
        }
        const { category, amount, memo } = req.body;
        if (!category || !amount) {
            return res.status(400).json({ error: '카테고리와 금액을 입력하세요.' });
        }
        const me = yield db_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!me || !me.landlordId)
            return res.status(400).json({ error: '임대인 정보가 없습니다. 관리자에게 문의하세요.' });
        // Grab physical tenant info
        const tenantRecord = yield db_1.prisma.tenant.findUnique({ where: { loginUserId: me.id } });
        const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
        const request = yield db_1.prisma.paymentRequest.create({
            data: {
                tenantUserId: me.id,
                landlordId: me.landlordId,
                tenantRecordId: (tenantRecord === null || tenantRecord === void 0 ? void 0 : tenantRecord.id) || null,
                category: category || 'RENT',
                amount: parsedAmount,
                memo: memo || null
            }
        });
        // --- 알림 메시지 빌드 ---
        let roomStr = '';
        const tenantName = me.name || me.username;
        if (tenantRecord === null || tenantRecord === void 0 ? void 0 : tenantRecord.roomId) {
            const r = yield db_1.prisma.room.findUnique({ where: { id: tenantRecord.roomId } });
            if (r)
                roomStr = `[${r.name}] `;
        }
        const categoryLabel = CATEGORY_LABELS[category] || category;
        const notifMessage = `${roomStr}${tenantName}님이 ${categoryLabel} ${parsedAmount.toLocaleString()}원에 대한 입금 확인을 요청했습니다.`;
        // --- NotificationLog(DB) Insert ---
        try {
            yield db_1.prisma.notificationLog.create({
                data: {
                    tenantId: me.id,
                    useCase: 'PAYMENT_CONFIRM',
                    channel: 'PUSH',
                    status: 'SENT',
                    sentAt: new Date(),
                    content: notifMessage
                }
            });
        }
        catch (logErr) {
            console.error('NotificationLog insert error (ignored):', logErr);
        }
        // --- 임대인 벨 알림 DB Insert ---
        try {
            yield db_1.prisma.bellNotification.create({
                data: {
                    userId: me.landlordId,
                    type: 'PAYMENT',
                    message: notifMessage,
                    actionTab: 'payments'
                }
            });
        }
        catch (bellErr) {
            console.error('BellNotification insert error (ignored):', bellErr);
        }
        // --- Web Push 알림 → 임대인 ---
        try {
            const subscriptions = yield db_1.prisma.pushSubscription.findMany({
                where: { userId: me.landlordId }
            });
            const payload = JSON.stringify({
                title: '💰 입금 확인 요청',
                body: notifMessage
            });
            for (const sub of subscriptions) {
                yield vapid_1.default.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload).catch(err => console.error('Push error:', err));
            }
        }
        catch (pushErr) {
            console.error('Push fail ignored:', pushErr);
        }
        res.json(Object.assign(Object.assign({}, request), { notifMessage }));
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/payments/:id/approve - Approve and auto-create rent transaction
router.post('/:id/approve', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        const id = req.params.id;
        const request = yield db_1.prisma.paymentRequest.findUnique({ where: { id } });
        if (!request || request.landlordId !== req.user.id) {
            return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
        }
        if (request.status === 'APPROVED') {
            return res.status(400).json({ error: '이미 승인된 요청입니다.' });
        }
        // 1. Mark approved
        yield db_1.prisma.paymentRequest.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
        // 2. Create Transaction (카테고리 매핑)
        let roomId = null;
        let descName = '임차인';
        if (request.tenantRecordId) {
            const tRec = yield db_1.prisma.tenant.findUnique({ where: { id: request.tenantRecordId } });
            if (tRec) {
                roomId = tRec.roomId;
                descName = tRec.name;
            }
        }
        else {
            const uRec = yield db_1.prisma.user.findUnique({ where: { id: request.tenantUserId } });
            if (uRec)
                descName = uRec.name || uRec.username;
        }
        const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
        const txCategory = request.category === 'MAINTENANCE_FEE' ? 'MAINTENANCE' : request.category === 'REPAIR' ? 'MAINTENANCE' : request.category;
        const transaction = yield db_1.prisma.transaction.create({
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
            yield db_1.prisma.bellNotification.create({
                data: {
                    userId: request.tenantUserId, // 수신자 = 세입자
                    type: 'PAYMENT',
                    message: `입금 확인 요청(${categoryLabel} ${request.amount.toLocaleString()}원)이 승인되었습니다. ✅`,
                    actionTab: 'payments'
                }
            });
        }
        catch (bellErr) {
            console.error('BellNotification insert error (ignored):', bellErr);
        }
        res.json({ success: true, transaction });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/payments/:id/reject - Reject request
router.post('/:id/reject', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'USER' && req.user.role !== 'ADMIN')
            return res.status(403).json({ error: '권한이 없습니다.' });
        const id = req.params.id;
        const request = yield db_1.prisma.paymentRequest.findUnique({ where: { id } });
        if (!request || request.landlordId !== req.user.id)
            return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
        yield db_1.prisma.paymentRequest.update({ where: { id }, data: { status: 'REJECTED' } });
        // --- 세입자에게 벨 알림 (임대인 본인 X) ---
        try {
            const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
            yield db_1.prisma.bellNotification.create({
                data: {
                    userId: request.tenantUserId, // 수신자 = 세입자
                    type: 'PAYMENT',
                    message: `입금 확인 요청(${categoryLabel} ${request.amount.toLocaleString()}원)이 거절되었습니다.`,
                    actionTab: 'payments'
                }
            });
        }
        catch (bellErr) {
            console.error('BellNotification insert error (ignored):', bellErr);
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
