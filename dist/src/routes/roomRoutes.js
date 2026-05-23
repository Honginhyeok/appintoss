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
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const rooms = yield db_1.prisma.room.findMany({
            where: { userId },
            include: { tenants: true, transactions: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(rooms);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // 검증 로직: 프리미엄 구독자 여부 및 생성된 방 개수 확인
        const userWithLimits = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            include: { _count: { select: { rooms: true } } }
        });
        if (!userWithLimits)
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        if (!userWithLimits.isSubscribed && userWithLimits._count.rooms >= 3) {
            return res.status(403).json({
                code: 'UPGRADE_REQUIRED',
                message: '무료 버전에서는 방을 최대 3개까지만 생성할 수 있습니다. 프리미엄 요금제로 업그레이드해 주세요.'
            });
        }
        const room = yield db_1.prisma.room.create({ data: Object.assign(Object.assign({}, req.body), { userId }) });
        res.json(room);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const room = yield db_1.prisma.room.update({ where: { id: String(req.params.id), userId }, data: req.body });
        res.json(room);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        yield db_1.prisma.room.delete({ where: { id: String(req.params.id), userId } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
