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
        const transactions = yield db_1.prisma.transaction.findMany({
            where: { userId },
            include: { room: true },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const data = Object.assign(Object.assign({}, req.body), { userId, amount: parseFloat(req.body.amount), date: req.body.date ? new Date(req.body.date) : new Date() });
        const transaction = yield db_1.prisma.transaction.create({ data });
        res.json(transaction);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const data = Object.assign(Object.assign({}, req.body), { amount: parseFloat(req.body.amount), date: req.body.date ? new Date(req.body.date) : new Date() });
        const transaction = yield db_1.prisma.transaction.update({ where: { id: String(req.params.id), userId }, data });
        res.json(transaction);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        yield db_1.prisma.transaction.delete({ where: { id: String(req.params.id), userId } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
