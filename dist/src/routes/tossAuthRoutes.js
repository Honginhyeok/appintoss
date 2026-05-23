"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tossAuthController_1 = require("../controllers/tossAuthController");
const router = (0, express_1.Router)();
// 1. 토스 인가 코드(Auth Code) 수신 및 엑세스 토큰 발급, 유저 로그인 처리
router.post('/login', tossAuthController_1.loginWithToss);
// 1-b. 토스 최초 로그인 시 추가 정보(초대코드/전화번호) 입력 후 가입 완료
router.post('/complete-registration', tossAuthController_1.completeTossRegistration);
// 2. 토스 웹 간편 로그인 콜백 리다이렉트 처리
router.get('/callback', tossAuthController_1.handleTossCallback);
// 3. 토스 앱에서 "연결 끊기" 발생 시 수신하는 콜백 웹훅
router.post('/unlink', tossAuthController_1.unlinkToss);
exports.default = router;
