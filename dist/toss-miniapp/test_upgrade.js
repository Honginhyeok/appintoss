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
const playwright_1 = require("playwright");
(() => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield playwright_1.chromium.launch({ headless: true });
    const context = yield browser.newContext({ viewport: { width: 480, height: 800 } });
    const page = yield context.newPage();
    try {
        console.log('로그인 및 쿠키 획득 중...');
        const response = yield page.request.post('http://localhost:5173/api/auth/login', {
            data: { username: 'admin', password: 'admin123', role: 'LANDLORD' }
        });
        // 쿠키를 localStorage 에도 임의로 넣어둡니다 (Rooms.tsx 가 로컬스토리지 token 을 요구할 수도 있으므로)
        const setCookieHeader = response.headers()['set-cookie'];
        let tokenValue = '';
        if (setCookieHeader) {
            const match = setCookieHeader.match(/token=([a-zA-Z0-9_.-]+)/);
            if (match)
                tokenValue = match[1];
        }
        console.log('페이지 이동 중...');
        yield page.goto('http://localhost:5173/rooms');
        yield page.evaluate((token) => {
            if (token)
                localStorage.setItem('token', token);
        }, tokenValue);
        yield page.reload();
        yield page.waitForLoadState('networkidle');
        page.on('dialog', dialog => {
            console.log('Dialog opened:', dialog.message());
            dialog.accept();
        });
        console.log('초기 화면 캡쳐 중...');
        yield page.screenshot({ path: 'upgrade_test_init.png' });
        console.log('방 추가 시도 중...');
        // 이미 방이 몇 개 있는지 모르므로 4번 시도합니다.
        for (let i = 1; i <= 4; i++) {
            yield page.fill('input[type="text"]', `테스트방 ${i}`);
            yield page.click('button:has-text("방 추가")');
            yield page.waitForTimeout(1000); // UI 반응 대기
            yield page.screenshot({ path: `upgrade_test_step_${i}.png` });
            // 만약 모달이 켜졌는지 확인
            const modalVisible = yield page.waitForSelector('text=프리미엄 전용 혜택', { timeout: 2000 }).catch(() => null);
            if (modalVisible) {
                console.log('업그레이드 모달 구동성공, 스크린샷 캡쳐 중...');
                yield page.waitForTimeout(1000); // 애니메이션 대기
                yield page.screenshot({ path: 'premium_upgrade_modal.png', fullPage: true });
                console.log('가상 결제 진행 테스트...');
                // Toss SDK 결제창 오픈 시 브라우저 내에서 방해받지 않도록 waitForTimeout
                yield page.click('text=4,900원 정기결제 시작하기');
                yield page.waitForTimeout(2000);
                break;
            }
        }
        console.log('결제 승인 & 자동 방 추가 결과 캡쳐 중...');
        // 결제가 완료되고 모달이 닫히며 원래 방이 추가되었는지 확인샷
        yield page.waitForTimeout(1000);
        yield page.screenshot({ path: 'premium_upgrade_success.png' });
    }
    catch (e) {
        console.error(e);
    }
    finally {
        yield browser.close();
    }
}))();
