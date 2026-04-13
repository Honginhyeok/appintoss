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
// ==========================================
// Announcements (공지사항)
// ==========================================
// GET /api/board/announcements - Get announcements
router.get('/announcements', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let landlordId = req.user.id;
        if (req.user.role === 'TENANT') {
            // If tenant, get the landlord id from DB
            const me = yield db_1.prisma.user.findUnique({ where: { id: req.user.id } });
            landlordId = (me === null || me === void 0 ? void 0 : me.landlordId) || '';
        }
        const announcements = yield db_1.prisma.announcement.findMany({
            where: { landlordId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(announcements);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/board/announcements - Create announcement (Landlord only)
router.post('/announcements', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        const { title, content, targetType, targetRooms } = req.body;
        if (!title || !content)
            return res.status(400).json({ error: '제목과 내용을 입력하세요.' });
        const announcement = yield db_1.prisma.announcement.create({
            data: {
                title,
                content,
                // Prisma schema 상 아직 필드가 없다면, 추후 마이그레이션이 필요하지만 
                // 일단 프론트엔드가 요청한 형태로 State 배열을 반환하기 위해 임시 할당할 수도 있습니다.
                // 하지만 Prisma strict mode 때문에 스키마에 없으면 에러가 나므로, schema.prisma 업데이트도 필수입니다.
                targetType: targetType || 'ALL',
                targetRooms: Array.isArray(targetRooms) ? JSON.stringify(targetRooms) : '[]',
                landlordId: req.user.id
            }
        });
        // 프론트엔드 호환성을 위해 targetRooms를 배열로 파싱해서 리턴
        const resultToReturn = Object.assign(Object.assign({}, announcement), { targetRooms: JSON.parse(announcement.targetRooms || '[]') });
        res.json(resultToReturn);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// DELETE /api/board/announcements/:id - Delete announcement (Landlord only)
router.delete('/announcements/:id', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const announcement = yield db_1.prisma.announcement.findUnique({ where: { id } });
        if (!announcement || announcement.landlordId !== req.user.id) {
            return res.status(404).json({ error: '공지사항을 찾을 수 없거나 권한이 없습니다.' });
        }
        yield db_1.prisma.announcement.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// ==========================================
// Maintenance Requests (고장/수리 문의)
// ==========================================
// GET /api/board/maintenance - Get requests
router.get('/maintenance', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role === 'TENANT') {
            // Tenants see only their own requests
            const requests = yield db_1.prisma.maintenanceRequest.findMany({
                where: { tenantId: req.user.id },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }
        else {
            // Landlord sees all requests for them
            const requests = yield db_1.prisma.maintenanceRequest.findMany({
                where: { landlordId: req.user.id },
                include: {
                    tenant: {
                        select: {
                            username: true,
                            name: true,
                            assignedRoom: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/board/maintenance - Create request (Tenant only)
router.post('/maintenance', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'TENANT') {
            return res.status(403).json({ error: '임차인만 접수할 수 있습니다.' });
        }
        const { title, content } = req.body;
        if (!title || !content)
            return res.status(400).json({ error: '제목과 내용을 입력하세요.' });
        const me = yield db_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!me || !me.landlordId)
            return res.status(400).json({ error: '임대인 정보를 찾을 수 없습니다.' });
        const request = yield db_1.prisma.maintenanceRequest.create({
            data: {
                title,
                content,
                tenantId: req.user.id,
                landlordId: me.landlordId
            }
        });
        // --- 임대인 벨 알림 DB Insert ---
        try {
            let roomStr = '';
            if (me.roomId) {
                const room = yield db_1.prisma.room.findUnique({ where: { id: me.roomId } });
                if (room)
                    roomStr = `[${room.name}] `;
            }
            yield db_1.prisma.bellNotification.create({
                data: {
                    userId: me.landlordId,
                    type: 'MAINTENANCE',
                    message: `${roomStr}수리 문의가 접수되었습니다: "${title}"`,
                    actionTab: 'maintenance'
                }
            });
        }
        catch (bellErr) {
            console.error('BellNotification insert error (ignored):', bellErr);
        }
        res.json(request);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// PUT /api/board/maintenance/:id/status - Update status (Landlord only)
router.put('/maintenance/:id/status', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        const id = req.params.id;
        const { status } = req.body; // PENDING | IN_PROGRESS | RESOLVED
        const request = yield db_1.prisma.maintenanceRequest.findUnique({ where: { id } });
        if (!request || request.landlordId !== req.user.id) {
            return res.status(404).json({ error: '요청을 찾을 수 없거나 권한이 없습니다.' });
        }
        const updated = yield db_1.prisma.maintenanceRequest.update({
            where: { id },
            data: { status }
        });
        // --- 세입자(작성자)에게 벨 알림 (임대인 본인에게는 절대 X) ---
        const STATUS_LABELS = {
            PENDING: '대기중',
            IN_PROGRESS: '처리중',
            RESOLVED: '완료됨'
        };
        try {
            // 세입자 User에서 방 이름 조회
            const tenantUser = yield db_1.prisma.user.findUnique({ where: { id: request.tenantId } });
            let roomStr = '';
            if (tenantUser === null || tenantUser === void 0 ? void 0 : tenantUser.roomId) {
                const room = yield db_1.prisma.room.findUnique({ where: { id: tenantUser.roomId } });
                if (room)
                    roomStr = `[${room.name}] `;
            }
            yield db_1.prisma.bellNotification.create({
                data: {
                    userId: request.tenantId, // 수신자 = 세입자
                    type: 'MAINTENANCE',
                    message: `${roomStr}요청하신 수리 문의가 '${STATUS_LABELS[status] || status}'(으)로 변경되었습니다.`,
                    actionTab: 'maintenance'
                }
            });
        }
        catch (bellErr) {
            console.error('BellNotification insert error (ignored):', bellErr);
        }
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
