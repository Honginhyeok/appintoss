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
        const [rooms, transactions, tenants] = yield Promise.all([
            db_1.prisma.room.findMany({ where: { userId } }),
            db_1.prisma.transaction.findMany({ where: { userId } }),
            db_1.prisma.tenant.count({ where: { userId } }),
        ]);
        const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
        const netProfit = totalIncome - totalExpense;
        const vacantRooms = rooms.filter((r) => r.status === 'VACANT').length;
        const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
        res.json({ totalIncome, totalExpense, netProfit, totalRooms: rooms.length, vacantRooms, occupiedRooms, totalTenants: tenants });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
