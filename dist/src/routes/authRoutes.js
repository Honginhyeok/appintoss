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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// ─── CHECK USERNAME (public) ──────────────────────────────────────────
router.get('/check-username', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string')
            return res.status(400).json({ error: '아이디를 입력하세요' });
        const existing = yield db_1.prisma.user.findUnique({ where: { username } });
        if (existing) {
            res.json({ available: false, message: '이미 존재하는 아이디입니다' });
        }
        else {
            res.json({ available: true, message: '사용 가능한 아이디입니다' });
        }
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── REGISTER (public) ─────────────────────────────────────────────
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role } = req.body;
        if (role === 'TENANT') {
            const { name, phone, roomId } = req.body;
            if (!name || !phone || !roomId) {
                return res.status(400).json({ error: '이름, 전화번호, 방(roomId)을 모두 입력하세요' });
            }
            const generatedUsername = 'tenant_' + phone;
            const dummyPassword = Math.random().toString(36).slice(-8); // 서버 난수 비밀번호
            const existing = yield db_1.prisma.user.findUnique({ where: { username: generatedUsername } });
            if (existing)
                return res.status(400).json({ error: '해당 전화번호로 이미 가입된 임차인 계정이 존재합니다' });
            const hashedPassword = yield bcrypt_1.default.hash(dummyPassword, 10);
            const dummyEmail = `tenant_${phone}@dummy.com`;
            // roomId가 UUID인지 방 이름인지 판별 후 실제 UUID로 변환
            let resolvedRoomId = null;
            if (roomId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(roomId)) {
                    const roomExists = yield db_1.prisma.room.findUnique({ where: { id: roomId } });
                    if (roomExists)
                        resolvedRoomId = roomId;
                }
                else {
                    const roomByName = yield db_1.prisma.room.findFirst({ where: { name: roomId } });
                    if (roomByName)
                        resolvedRoomId = roomByName.id;
                }
            }
            yield db_1.prisma.user.create({
                data: {
                    username: generatedUsername,
                    name,
                    phone,
                    email: dummyEmail,
                    password: hashedPassword,
                    plainPassword: dummyPassword,
                    roles: ['TENANT'],
                    status: 'ACTIVE',
                    roomId: resolvedRoomId
                }
            });
            return res.json({ success: true, message: '임차인 회원가입이 완료되었습니다.' });
        }
        else if (role === 'LANDLORD') {
            const { username, password, email, name, phone } = req.body;
            if (!username || !password || !email || !name) {
                return res.status(400).json({ error: '이름, 아이디, 이메일, 비밀번호를 모두 입력하세요' });
            }
            if (password.length < 4)
                return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다' });
            const existing = yield db_1.prisma.user.findUnique({ where: { username } });
            if (existing)
                return res.status(400).json({ error: '이미 존재하는 아이디입니다' });
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            yield db_1.prisma.user.create({
                data: { username, name, phone: phone || null, email, password: hashedPassword, plainPassword: password, roles: ['LANDLORD'], status: 'ACTIVE' }
            });
            return res.json({ success: true, message: '임대인 회원가입이 완료되었습니다. 로그인해 주세요.' });
        }
        else {
            return res.status(400).json({ error: '유효하지 않은 role입니다. (TENANT 또는 LANDLORD 필수)' });
        }
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── REGISTER TENANT VIA CODE (No-Password) ────────────────────────
router.post('/register-tenant', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, inviteCode } = req.body;
        if (!name || !phone || !inviteCode)
            return res.status(400).json({ error: '성함, 전화번호, 초대코드를 모두 입력하세요' });
        // 하이픈 제거한 순수 숫자열로 정규화
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        // Validate invite code
        const invitation = yield db_1.prisma.invitation.findUnique({ where: { code: inviteCode } });
        if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
            return res.status(400).json({ error: '유효하지 않거나 이미 사용된 초대권입니다.' });
        }
        // 자동 생성 username (tenant_ + 전화번호)
        const generatedUsername = 'tenant_' + cleanPhone;
        const existing = yield db_1.prisma.user.findUnique({ where: { username: generatedUsername } });
        if (existing)
            return res.status(400).json({ error: '해당 전화번호로 이미 가입된 임차인 계정이 존재합니다' });
        // 유저 객체에 바로 매핑할 roomId를 Physical Tenant 정보에서 획득
        // 오직 초대코드에 연결된 Tenant 레코드의 roomId만을 사용합니다 (단일 진실 공급원)
        let mappedRoomId = null;
        if (invitation.tenantId) {
            const physicalTenant = yield db_1.prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
            if (physicalTenant === null || physicalTenant === void 0 ? void 0 : physicalTenant.roomId)
                mappedRoomId = physicalTenant.roomId;
        }
        // 더미 비밀번호 자동 생성 (임차인은 전화번호로 로그인하므로 비밀번호 불필요)
        const dummyPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = yield bcrypt_1.default.hash(dummyPassword, 10);
        const dummyEmail = `tenant_${cleanPhone}@dummy.com`;
        const user = yield db_1.prisma.user.create({
            data: {
                username: generatedUsername,
                name,
                phone: cleanPhone,
                email: dummyEmail,
                password: hashedPassword,
                plainPassword: dummyPassword,
                roles: ['TENANT'],
                status: 'ACTIVE',
                landlordId: invitation.landlordId || null,
                roomId: mappedRoomId || null
            }
        });
        // Mark invitation as used
        yield db_1.prisma.invitation.update({
            where: { id: invitation.id },
            data: { isUsed: true, usedBy: user.id }
        });
        // Map physical tenant record to user
        if (invitation.tenantId) {
            yield db_1.prisma.tenant.update({
                where: { id: invitation.tenantId },
                data: { loginUserId: user.id }
            }).catch(err => console.log('Failed to map tenant info:', err));
        }
        res.json({ success: true, message: '임차인 가입이 완료되었습니다. 전화번호로 바로 로그인하세요!' });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── LINK TENANT VIA INVITE CODE (For Toss Users) ────────────────────────
router.put('/link-tenant-invite', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode)
            return res.status(400).json({ error: '초대코드를 입력하세요' });
        const user = yield db_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(401).json({ error: '사용자를 찾을 수 없습니다' });
        const invitation = yield db_1.prisma.invitation.findUnique({ where: { code: inviteCode } });
        if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
            return res.status(400).json({ error: '유효하지 않거나 이미 사용된 초대권입니다.' });
        }
        let mappedRoomId = null;
        if (invitation.tenantId) {
            const physicalTenant = yield db_1.prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
            if (physicalTenant === null || physicalTenant === void 0 ? void 0 : physicalTenant.roomId)
                mappedRoomId = physicalTenant.roomId;
        }
        yield db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                landlordId: invitation.landlordId || null,
                roomId: mappedRoomId || null
            }
        });
        yield db_1.prisma.invitation.update({
            where: { id: invitation.id },
            data: { isUsed: true, usedBy: user.id }
        });
        if (invitation.tenantId) {
            yield db_1.prisma.tenant.update({
                where: { id: invitation.tenantId },
                data: { loginUserId: user.id }
            }).catch(err => console.log('Failed to map tenant info:', err));
        }
        res.json({ success: true, message: '방 연결이 완료되었습니다!' });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login requests per windowMs
    message: { error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해 주세요.' }
});
// ─── LOGIN ──────────────────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { loginType, role } = req.body;
        const reqRole = role || (loginType === 'tenant' ? 'TENANT' : 'LANDLORD');
        if (reqRole === 'TENANT') {
            const { phone } = req.body;
            if (!phone)
                return res.status(400).json({ error: '휴대폰 번호를 입력하세요' });
            // 하이픈 제거한 순수 숫자열
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            // 하이픈 포맷 (010-1234-5678)
            const hyphenPhone = cleanPhone.length === 11
                ? cleanPhone.slice(0, 3) + '-' + cleanPhone.slice(3, 7) + '-' + cleanPhone.slice(7)
                : cleanPhone;
            // DB에서 OR 조건으로 유저 검색 (숫자열 또는 하이픈 포맷 어느 쪽이든 매칭)
            const targetUsername = 'tenant_' + cleanPhone;
            const user = yield db_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { username: targetUsername },
                        { phone: cleanPhone },
                        { phone: hyphenPhone }
                    ]
                }
            });
            if (!user)
                return res.status(401).json({ error: '등록된 전화번호가 없습니다. 회원가입을 먼저 진행해 주세요.' });
            // isActive 차단 (초대코드 삭제 → 퇴실 처리된 계정)
            if (user.isActive === false) {
                return res.status(403).json({ error: '임대인에 의해 접근이 제한된 계정입니다. (퇴실 처리됨)' });
            }
            if (user.status === 'PENDING')
                return res.status(403).json({ error: '관리자 승인 대기 중입니다' });
            if (user.status === 'SUSPENDED')
                return res.status(403).json({ error: '계정이 정지되었습니다' });
            // TENANT는 비밀번호 검증 생략 → 즉시 토큰 발급
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, roles: user.roles, currentRole: 'TENANT', status: user.status }, env_1.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: true, secure: env_1.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
            return res.json({ success: true, token, user: { id: user.id, username: user.username, roles: user.roles, currentRole: 'TENANT', status: user.status } });
        }
        else if (reqRole === 'LANDLORD') {
            const { username, password } = req.body;
            if (!username || !password)
                return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });
            const user = yield db_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { username },
                        { email: username }
                    ]
                }
            });
            if (!user)
                return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다' });
            if (((_a = user.roles) === null || _a === void 0 ? void 0 : _a.includes('TENANT')) && !((_b = user.roles) === null || _b === void 0 ? void 0 : _b.includes('LANDLORD')))
                return res.status(403).json({ error: '임대인 로그인 폼을 이용해 주세요' });
            // LANDLORD는 비밀번호 필수 검증
            const valid = yield bcrypt_1.default.compare(password, user.password);
            if (!valid)
                return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다' });
            if (user.status === 'PENDING')
                return res.status(403).json({ error: '관리자 승인 대기 중입니다' });
            if (user.status === 'SUSPENDED')
                return res.status(403).json({ error: '계정이 정지되었습니다' });
            // PC 웹 버전 (inToss === false) 인 경우 구독 여부 검사
            if (req.body.inToss === false) {
                const isSuperAdmin = user.username === 'wjsdudtns' || ((_c = user.roles) === null || _c === void 0 ? void 0 : _c.includes('ADMIN'));
                if (!isSuperAdmin && !user.isSubscribed) {
                    return res.status(403).json({ error: 'PC 웹 버전은 프리미엄 구독자 전용입니다. 토스 앱에서 먼저 구독해 주세요.' });
                }
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, roles: user.roles, currentRole: 'LANDLORD', status: user.status }, env_1.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: true, secure: env_1.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
            return res.json({ success: true, token, user: { id: user.id, username: user.username, roles: user.roles, currentRole: 'LANDLORD', status: user.status } });
        }
        else {
            return res.status(400).json({ error: '유효하지 않은 역할(Role)입니다' });
        }
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── TOSS OAUTH LOGIN CALLBACK (WEB) ───────────────────────────────────
const axios_1 = __importDefault(require("axios"));
router.get('/toss/callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { code, state, error } = req.query;
        if (error) {
            return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
        }
        if (!code) {
            return res.redirect(`/?error=No+Code`);
        }
        const { TOSS_CLIENT_ID, TOSS_SECRET_KEY } = process.env;
        if (!TOSS_CLIENT_ID || !TOSS_SECRET_KEY) {
            return res.status(500).send('Toss OAuth credentials not configured on server.');
        }
        const redirectUri = 'https://notification-dashboard-1042551861454.asia-northeast1.run.app/api/auth/toss/callback';
        // 1. Get Access Token
        const tokenResponse = yield axios_1.default.post('https://oauth2-api.toss.im/api/v1/token', new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: TOSS_CLIENT_ID,
            client_secret: TOSS_SECRET_KEY,
            code: String(code),
            redirect_uri: redirectUri
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const { access_token } = tokenResponse.data;
        // 2. Get User Info
        const userResponse = yield axios_1.default.get('https://oauth2-api.toss.im/api/v1/user-info', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const tossUser = userResponse.data;
        const phone = tossUser.phoneNumber || tossUser.phone || '';
        const name = tossUser.name || '토스사장님';
        // 3. Find or Create User (Landlord for web)
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const targetUsername = `toss_${cleanPhone || Math.random().toString(36).slice(-6)}`;
        let user = yield db_1.prisma.user.findFirst({
            where: {
                OR: cleanPhone ? [
                    { username: targetUsername },
                    { phone: cleanPhone },
                    { phone: phone }
                ] : [{ username: targetUsername }]
            }
        });
        if (!user) {
            // Create new landlord
            const dummyPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = yield bcrypt_1.default.hash(dummyPassword, 10);
            user = yield db_1.prisma.user.create({
                data: {
                    username: targetUsername,
                    name: name,
                    phone: cleanPhone || null,
                    email: `${targetUsername}@dummy.com`,
                    password: hashedPassword,
                    plainPassword: dummyPassword,
                    roles: ['LANDLORD'],
                    status: 'ACTIVE'
                }
            });
        }
        // 4. Generate JWT & Redirect
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, roles: user.roles, currentRole: 'LANDLORD', status: user.status }, env_1.JWT_SECRET, { expiresIn: '7d' });
        // Set cookie and redirect back to root with token hash
        res.cookie('token', token, { httpOnly: true, secure: env_1.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        // Frontend JS will parse this hash to log in instantly
        res.redirect(`/#access_token=${token}`);
    }
    catch (e) {
        console.error('Toss OAuth Error:', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
        res.redirect(`/?error=TossLoginFailed`);
    }
}));
// ─── LOGOUT ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});
// ─── ME ─────────────────────────────────────────────────────────────
router.get('/me', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userInDb = yield db_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!userInDb)
            return res.status(401).json({ error: 'User not found' });
        const profile = {
            id: userInDb.id,
            username: userInDb.username,
            name: userInDb.name,
            phone: userInDb.phone,
            email: userInDb.email,
            role: req.user.currentRole || (((_a = userInDb.roles) === null || _a === void 0 ? void 0 : _a.includes('TENANT')) ? 'TENANT' : (((_b = userInDb.roles) === null || _b === void 0 ? void 0 : _b.includes('LANDLORD')) ? 'LANDLORD' : 'USER')),
            roles: userInDb.roles,
            status: userInDb.status,
            settlementBank: userInDb.settlementBank,
            settlementAccount: userInDb.settlementAccount,
            settlementName: userInDb.settlementName
        };
        // 임차인이면 배정된 방, 임대인 정산 정보, 월세 금액 포함
        if (userInDb.roles.includes('TENANT')) {
            if (userInDb.roomId) {
                const room = yield db_1.prisma.room.findUnique({ where: { id: userInDb.roomId } });
                if (room)
                    profile.roomName = room.name;
            }
            if (userInDb.landlordId) {
                const landlord = yield db_1.prisma.user.findUnique({ where: { id: userInDb.landlordId } });
                if (landlord) {
                    profile.landlordSettlementBank = landlord.settlementBank;
                    profile.landlordSettlementAccount = landlord.settlementAccount;
                    profile.landlordSettlementName = landlord.settlementName;
                }
            }
            const tenantRecord = yield db_1.prisma.tenant.findUnique({ where: { loginUserId: userInDb.id } });
            if (tenantRecord && tenantRecord.rentAmount) {
                profile.rentAmount = tenantRecord.rentAmount;
            }
        }
        res.json({ user: profile });
    }
    catch (e) {
        console.error('ME error:', e);
        res.status(500).json({ error: e.message });
    }
}));
// ─── LINK EMAIL (Authenticated) ─────────────────────────────────────────
router.put('/link-email', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { email, password } = req.body;
        if (!email || !password || password.length < 4) {
            return res.status(400).json({ error: '유효한 이메일과 4자 이상의 비밀번호를 입력하세요' });
        }
        // 이메일 중복 검사
        const existing = yield db_1.prisma.user.findFirst({ where: { email } });
        if (existing && existing.id !== userId) {
            return res.status(400).json({ error: '이미 사용 중인 이메일입니다' });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const updatedUser = yield db_1.prisma.user.update({
            where: { id: userId },
            data: {
                email,
                password: hashedPassword,
                plainPassword: password // 암호화되지 않은 원본 저장 (기존 시스템 호환용)
            }
        });
        res.json({ success: true, message: '이메일 계정이 성공적으로 연동되었습니다.' });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── CHANGE PASSWORD (self) ─────────────────────────────────────────
router.put('/password', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요' });
        if (newPassword.length < 4)
            return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다' });
        const user = yield db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const valid = yield bcrypt_1.default.compare(currentPassword, user.password);
        if (!valid)
            return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다' });
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        yield db_1.prisma.user.update({ where: { id: userId }, data: { password: hashedPassword, plainPassword: newPassword } });
        res.json({ success: true });
    }
    catch (e) {
        console.error('Prisma Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
// ─── UPDATE SETTLEMENT INFO (Landlords) ─────────────────────────────────
router.put('/settlement', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (req.user.role === 'TENANT') {
            return res.status(403).json({ error: '임차인은 정산 계좌를 등록할 수 없습니다.' });
        }
        const { settlementBank, settlementAccount, settlementName } = req.body;
        yield db_1.prisma.user.update({
            where: { id: userId },
            data: { settlementBank, settlementAccount, settlementName }
        });
        res.json({ success: true });
    }
    catch (e) {
        console.error('Settlement Error:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}));
exports.default = router;
