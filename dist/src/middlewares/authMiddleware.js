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
exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
    if (!token && typeof req.headers.authorization === 'string') {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    jsonwebtoken_1.default.verify(token, env_1.JWT_SECRET, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (err)
            return res.status(403).json({ error: 'Forbidden' });
        try {
            // JWT 서명이 유효해도 DB에 실제로 존재하는 유저인지 확인
            // (DB 초기화, 재배포 후 오래된 쿠키로 인한 FK 오류 방지)
            const userInDb = yield db_1.prisma.user.findUnique({ where: { id: decoded.id } });
            if (!userInDb) {
                // 유저가 DB에 없으면 쿠키 삭제 후 401 반환 → 프론트엔드가 로그인 화면으로 이동
                res.clearCookie('token');
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
            // 비활성화된 계정 차단 (초대코드 삭제 → 퇴실 처리)
            if (userInDb.isActive === false) {
                res.clearCookie('token');
                return res.status(403).json({ error: '임대인에 의해 접근이 제한된 계정입니다. (퇴실 처리됨)' });
            }
            req.user = decoded;
            next();
        }
        catch (e) {
            return res.status(500).json({ error: 'Auth check failed: ' + e.message });
        }
    }));
});
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN')
        return res.status(403).json({ error: 'Require Admin role' });
    next();
};
exports.requireAdmin = requireAdmin;
