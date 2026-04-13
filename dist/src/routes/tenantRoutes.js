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
        const tenants = yield db_1.prisma.tenant.findMany({
            where: { userId },
            include: { room: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(tenants);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const data = Object.assign(Object.assign({}, req.body), { userId, moveInDate: req.body.moveInDate ? new Date(req.body.moveInDate) : null, moveOutDate: req.body.moveOutDate ? new Date(req.body.moveOutDate) : null, deposit: req.body.deposit ? parseFloat(req.body.deposit) : null, rentType: req.body.rentType || 'MONTHLY', rentAmount: req.body.rentAmount ? parseFloat(req.body.rentAmount) : null, rentPaymentDay: req.body.rentPaymentDay ? parseInt(req.body.rentPaymentDay, 10) : null, customRentStartDate: req.body.customRentStartDate ? new Date(req.body.customRentStartDate) : null, customRentEndDate: req.body.customRentEndDate ? new Date(req.body.customRentEndDate) : null, phone: req.body.phone ? String(req.body.phone).replace(/[^0-9]/g, '') : null });
        // Ensure monthlyRent isn't accidentally pushed
        delete data.monthlyRent;
        const tenant = yield db_1.prisma.tenant.create({ data });
        // Update room status to OCCUPIED
        if (data.roomId) {
            yield db_1.prisma.room.update({ where: { id: String(data.roomId) }, data: { status: 'OCCUPIED' } });
        }
        res.json(tenant);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const data = Object.assign(Object.assign({}, req.body), { moveInDate: req.body.moveInDate ? new Date(req.body.moveInDate) : null, moveOutDate: req.body.moveOutDate ? new Date(req.body.moveOutDate) : null, deposit: req.body.deposit ? parseFloat(req.body.deposit) : null, rentType: req.body.rentType || 'MONTHLY', rentAmount: req.body.rentAmount ? parseFloat(req.body.rentAmount) : null, rentPaymentDay: req.body.rentPaymentDay ? parseInt(req.body.rentPaymentDay, 10) : null, customRentStartDate: req.body.customRentStartDate ? new Date(req.body.customRentStartDate) : null, customRentEndDate: req.body.customRentEndDate ? new Date(req.body.customRentEndDate) : null, phone: req.body.phone ? String(req.body.phone).replace(/[^0-9]/g, '') : null });
        delete data.monthlyRent;
        const tenant = yield db_1.prisma.tenant.update({ where: { id: String(req.params.id), userId }, data });
        res.json(tenant);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const tenant = yield db_1.prisma.tenant.findUnique({ where: { id: String(req.params.id) } });
        yield db_1.prisma.tenant.delete({ where: { id: String(req.params.id), userId } });
        // If this was the last tenant in the room, set room to VACANT
        if (tenant === null || tenant === void 0 ? void 0 : tenant.roomId) {
            const remaining = yield db_1.prisma.tenant.count({ where: { roomId: tenant.roomId } });
            if (remaining === 0) {
                yield db_1.prisma.room.update({ where: { id: String(tenant.roomId) }, data: { status: 'VACANT' } });
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
