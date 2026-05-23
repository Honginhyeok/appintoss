import { Router } from 'express';
import { loginWithToss, unlinkToss, handleTossCallback, completeTossRegistration } from '../controllers/tossAuthController';

const router = Router();

// 1. 토스 인가 코드(Auth Code) 수신 및 엑세스 토큰 발급, 유저 로그인 처리
router.post('/login', loginWithToss);

// 1-b. 토스 최초 로그인 시 추가 정보(초대코드/전화번호) 입력 후 가입 완료
router.post('/complete-registration', completeTossRegistration);

// 2. 토스 웹 간편 로그인 콜백 리다이렉트 처리
router.get('/callback', handleTossCallback);

// 3. 토스 앱에서 "연결 끊기" 발생 시 수신하는 콜백 웹훅
router.post('/unlink', unlinkToss);

export default router;
