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
const db_1 = require("../config/db");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// GET /api/in-app-notifications — 자신의 알림 조회
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let roleFilter = {};
        if (req.user.currentRole === 'LANDLORD') {
            // 임대인 모드일 때는 자신이 임차인으로서 받은 청구서 알림을 가림
            roleFilter = { NOT: { title: { contains: '청구서' } } };
        }
        else if (req.user.currentRole === 'TENANT') {
            // 임차인 모드일 때는 임대인 전용 알림을 가림 (추후 확장 대비)
            roleFilter = { NOT: { title: { contains: '입금' } } };
        }
        const notifications = yield db_1.prisma.notification.findMany({
            where: Object.assign({ userId: req.user.id }, roleFilter),
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    }
    catch (e) {
        console.error('In-App notification fetch error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/in-app-notifications — 임대인이 세입자에게 알림 전송
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetUserId, title, message, link } = req.body;
        // 권한 체크: 임대인 또는 어드민만 발송 가능하도록 허용
        const userRoles = req.user.roles || [];
        if (req.user.currentRole !== 'LANDLORD' && !userRoles.includes('ADMIN')) {
            return res.status(403).json({ error: '임대인 권한이 필요합니다.' });
        }
        if (!targetUserId || !title || !message) {
            return res.status(400).json({ error: '필수 값이 부족합니다.' });
        }
        const newNotif = yield db_1.prisma.notification.create({
            data: {
                userId: targetUserId,
                title,
                message,
                link
            }
        });
        res.json({ success: true, notification: newNotif });
    }
    catch (e) {
        console.error('In-App notification send error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// PATCH /api/in-app-notifications/:id/read — 읽음 처리
router.patch('/:id/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const notif = yield db_1.prisma.notification.findUnique({ where: { id } });
        if (!notif || notif.userId !== req.user.id) {
            return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
        }
        yield db_1.prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (e) {
        console.error('In-App notification update error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// PATCH /api/in-app-notifications/read-all — 모두 읽음 처리
router.patch('/read-all/batch', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
