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
// GET /api/bell-notifications — 7일 이내 알림 조회
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const notifications = yield db_1.prisma.bellNotification.findMany({
            where: {
                userId: req.user.id,
                createdAt: { gte: sevenDaysAgo }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    }
    catch (e) {
        console.error('Bell notification fetch error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// DELETE /api/bell-notifications/:id — 알림 수동 삭제
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const notif = yield db_1.prisma.bellNotification.findUnique({ where: { id } });
        if (!notif || notif.userId !== req.user.id) {
            return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
        }
        yield db_1.prisma.bellNotification.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (e) {
        console.error('Bell notification delete error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// PUT /api/bell-notifications/:id/read — 읽음 처리
router.put('/:id/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        yield db_1.prisma.bellNotification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// PUT /api/bell-notifications/read-all — 모두 읽음 처리
router.put('/read-all/batch', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.prisma.bellNotification.updateMany({
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
