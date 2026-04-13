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
// Protect all admin routes
router.use(authMiddleware_1.authenticateToken, authMiddleware_1.requireAdmin);
// Get rooms belonging to a specific landlord (for assignment dropdowns)
router.get('/rooms/:landlordId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const landlordId = String(req.params.landlordId);
        if (!landlordId || landlordId === 'undefined')
            return res.json([]);
        const rooms = yield db_1.prisma.room.findMany({
            where: { userId: landlordId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
        res.json(rooms);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Backup only — keep this for data export
router.get('/backup', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [users, rooms, tenants, transactions] = yield Promise.all([
            db_1.prisma.user.findMany({
                select: { id: true, username: true, role: true, status: true, plainPassword: true, createdAt: true }
            }),
            db_1.prisma.room.findMany(),
            db_1.prisma.tenant.findMany(),
            db_1.prisma.transaction.findMany(),
        ]);
        res.json({
            exportedAt: new Date().toISOString(),
            version: '2.0',
            description: '호스텔 관리 시스템 데이터 백업',
            data: { users, rooms, tenants, transactions }
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
