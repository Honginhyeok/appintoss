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
    const context = yield browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = yield context.newPage();
    page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    try {
        // 1. 로그인 화면 진입
        console.log('1. 로그인 화면 진입...');
        yield page.goto('http://localhost:5174/');
        yield page.waitForLoadState('networkidle');
        yield page.waitForTimeout(500);
        yield page.screenshot({ path: 'auth_test_01_role_select.png' });
        // 2. 임대인 로그인 화면으로 이동
        console.log('2. 임대인 선택...');
        yield page.click('text=임대인으로 시작하기');
        yield page.waitForTimeout(300);
        yield page.screenshot({ path: 'auth_test_02_landlord_form.png' });
        // 3. 잘못된 비밀번호
        console.log('3. 로그인 실패 테스트...');
        yield page.fill('input[placeholder="아이디를 입력하세요"]', 'admin');
        yield page.fill('input[placeholder="비밀번호를 입력하세요"]', 'wrongpw');
        yield page.click('button:has-text("로그인")');
        yield page.waitForTimeout(1500);
        yield page.screenshot({ path: 'auth_test_03_login_error.png' });
        // 4. 올바른 비밀번호로 로그인
        console.log('4. 로그인 성공 테스트...');
        yield page.fill('input[placeholder="비밀번호를 입력하세요"]', 'admin123');
        yield page.click('button:has-text("로그인")');
        yield page.waitForTimeout(2000);
        yield page.screenshot({ path: 'auth_test_04_login_success.png' });
        // 페이지 URL 확인
        console.log('현재 URL:', page.url());
        // 5. 설정 페이지 네비게이션
        console.log('5. 설정 페이지...');
        // href 기반으로 클릭
        const settingsLink = page.locator('a[href="/settings"]');
        const count = yield settingsLink.count();
        console.log('설정 링크 수:', count);
        if (count > 0) {
            yield settingsLink.click();
            yield page.waitForTimeout(500);
            yield page.screenshot({ path: 'auth_test_05_settings.png' });
            // 6. 로그아웃
            console.log('6. 로그아웃...');
            yield page.click('button:has-text("로그아웃")');
            yield page.waitForTimeout(1500);
            yield page.screenshot({ path: 'auth_test_06_after_logout.png' });
        }
        else {
            console.log('설정 링크를 찾을 수 없음 — 페이지 상태 캡처');
            yield page.screenshot({ path: 'auth_test_05_no_settings.png' });
        }
        console.log('\n✅ 테스트 완료!');
    }
    catch (e) {
        console.error('❌ 에러:', e);
        yield page.screenshot({ path: 'auth_test_error.png' });
    }
    finally {
        yield browser.close();
    }
}))();
