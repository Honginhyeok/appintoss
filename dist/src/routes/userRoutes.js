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
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../config/db");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// ─── USER MANAGEMENT (ADMIN ONLY) ──────────────────────────────────
router.use(authMiddleware_1.authenticateToken, authMiddleware_1.requireAdmin);
// List all users
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db_1.prisma.user.findMany({
            select: {
                id: true, name: true, username: true, role: true, status: true, createdAt: true, plainPassword: true,
                landlord: { select: { id: true, name: true, username: true } },
                assignedRoom: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(users);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Create user (admin bypass — directly ACTIVE)
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, role } = req.body;
        const existing = yield db_1.prisma.user.findUnique({ where: { username } });
        if (existing)
            return res.status(400).json({ error: '이미 존재하는 아이디입니다' });
        // 임차인의 경우 비밀번호가 비어있을 수 있으므로 예외 처리
        const finalPassword = (role === 'TENANT' && !password) ? 'NO_PASSWORD' : password;
        if (!finalPassword)
            return res.status(400).json({ error: '비밀번호를 입력하세요' });
        const hashedPassword = yield bcrypt_1.default.hash(finalPassword, 10);
        const user = yield db_1.prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                plainPassword: role === 'TENANT' ? null : finalPassword,
                role: role || 'USER',
                status: 'ACTIVE'
            },
            select: { id: true, username: true, role: true, status: true, createdAt: true, plainPassword: true }
        });
        res.json(user);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Delete user
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = String(req.params.id);
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === id)
            return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다' });
        const userToDelete = yield db_1.prisma.user.findUnique({ where: { id } });
        if ((userToDelete === null || userToDelete === void 0 ? void 0 : userToDelete.username) === 'admin')
            return res.status(400).json({ error: '기본 관리자 계정은 삭제할 수 없습니다' });
        yield db_1.prisma.user.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Reset password (admin)
router.put('/:id/password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const { password } = req.body;
        if (!password)
            return res.status(400).json({ error: '비밀번호를 입력하세요' });
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        yield db_1.prisma.user.update({ where: { id }, data: { password: hashedPassword, plainPassword: password } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Change user status (approve / suspend)
router.put('/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = String(req.params.id);
        const { status } = req.body;
        if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: '유효하지 않은 상태입니다' });
        }
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === id)
            return res.status(400).json({ error: '자기 자신의 상태는 변경할 수 없습니다' });
        yield db_1.prisma.user.update({ where: { id }, data: { status } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Change user role
router.put('/:id/role', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = String(req.params.id);
        const { role } = req.body;
        if (!['ADMIN', 'USER', 'TENANT', 'LANDLORD'].includes(role)) {
            return res.status(400).json({ error: '유효하지 않은 역할입니다' });
        }
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === id)
            return res.status(400).json({ error: '자기 자신의 역할은 변경할 수 없습니다' });
        yield db_1.prisma.user.update({ where: { id }, data: { role } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// Assign tenant to landlord and room
router.put('/:id/assign', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const { landlordId, roomId } = req.body;
        // Validate target user exists and is a TENANT
        const user = yield db_1.prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== 'TENANT') {
            return res.status(400).json({ error: '해당 임차인을 찾을 수 없거나 권한이 올바르지 않습니다' });
        }
        yield db_1.prisma.user.update({
            where: { id },
            data: { landlordId, roomId }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
