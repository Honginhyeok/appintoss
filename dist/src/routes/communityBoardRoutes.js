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
// 헬퍼 함수: 유저의 landlordId 구하기 (해당 그룹)
// - TENANT: 자신의 landlordId
// - LANDLORD (USER/ADMIN): 자기 자신(id), 만약 별도의 landlordId가 세팅되었다면 그 값
function getLandlordId(userId, role) {
    return __awaiter(this, void 0, void 0, function* () {
        if (role === 'TENANT') {
            const me = yield db_1.prisma.user.findUnique({ where: { id: userId } });
            return (me === null || me === void 0 ? void 0 : me.landlordId) || '';
        }
        return userId; // Landlord is their own group root
    });
}
// GET /api/community-board - 전체 게시글 및 댓글 갯수 조회
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.query;
        const landlordId = yield getLandlordId(req.user.id, req.user.role);
        const whereClause = { landlordId };
        if (category && category !== '전체') {
            whereClause.category = category;
        }
        // 세입자는 자신이 쓴 글과 임대인이 쓴 글(공지사항 등)만 볼 수 있도록 필터링
        if (req.user.role === 'TENANT') {
            whereClause.OR = [
                { authorId: req.user.id }, // 본인이 쓴 글
                { authorId: landlordId } // 임대인이 쓴 글
            ];
        }
        const posts = yield db_1.prisma.post.findMany({
            where: whereClause,
            include: {
                author: { select: { name: true, username: true, role: true } },
                _count: { select: { comments: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(posts);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// GET /api/community-board/:id - 게시글 상세 및 댓글 조회
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const landlordId = yield getLandlordId(req.user.id, req.user.role);
        const post = yield db_1.prisma.post.findUnique({
            where: { id },
            include: {
                author: { select: { name: true, username: true, role: true } },
                comments: {
                    include: { author: { select: { name: true, username: true, role: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!post || post.landlordId !== landlordId) {
            return res.status(404).json({ error: '게시글을 찾을 수 없거나 접근 권한이 없습니다.' });
        }
        // 세입자는 다른 세입자의 글을 볼 수 없음
        if (req.user.role === 'TENANT' && post.authorId !== req.user.id && post.authorId !== landlordId) {
            return res.status(403).json({ error: '다른 세입자의 게시글은 열람할 수 없습니다.' });
        }
        res.json(post);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/community-board - 새 글 작성
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content, category } = req.body;
        // 검증: 공지사항은 임대인만 작성 가능
        if (category === '공지사항' && (req.user.role === 'TENANT')) {
            return res.status(403).json({ error: '공지사항은 임대인만 작성할 수 있습니다.' });
        }
        if (!title || !content || !category) {
            return res.status(400).json({ error: '제목, 내용, 카테고리를 모두 입력해주세요.' });
        }
        const landlordId = yield getLandlordId(req.user.id, req.user.role);
        if (!landlordId)
            return res.status(400).json({ error: '소속된 원룸 정보를 찾을 수 없습니다.' });
        const post = yield db_1.prisma.post.create({
            data: {
                title,
                content,
                category,
                authorId: req.user.id,
                landlordId
            },
            include: {
                author: { select: { name: true, username: true, role: true } },
                _count: { select: { comments: true } }
            }
        });
        res.json(post);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
// POST /api/community-board/:id/comments - 새 댓글 작성
router.post('/:id/comments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const { content } = req.body;
        if (!content)
            return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
        const landlordId = yield getLandlordId(req.user.id, req.user.role);
        const post = yield db_1.prisma.post.findUnique({ where: { id: postId } });
        if (!post || post.landlordId !== landlordId) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        const comment = yield db_1.prisma.comment.create({
            data: {
                content,
                postId,
                authorId: req.user.id
            },
            include: {
                author: { select: { name: true, username: true, role: true } }
            }
        });
        res.json(comment);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
