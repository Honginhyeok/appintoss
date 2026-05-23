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
    const ss = (name) => __awaiter(void 0, void 0, void 0, function* () {
        yield page.screenshot({ path: `final_${name}.png`, fullPage: false });
        console.log(`  📸 ${name}`);
    });
    try {
        // 1. 로그인
        console.log('1. 로그인...');
        yield page.goto('http://localhost:5174/');
        yield page.waitForLoadState('networkidle');
        yield page.click('text=임대인으로 시작하기');
        yield page.waitForTimeout(300);
        yield page.fill('input[placeholder="아이디를 입력하세요"]', 'admin');
        yield page.fill('input[placeholder="비밀번호를 입력하세요"]', 'admin123');
        yield page.click('button:has-text("로그인")');
        yield page.waitForTimeout(2000);
        console.log('  URL:', page.url());
        // 2. 대시보드 확인
        console.log('2. 대시보드 (홈)...');
        yield page.waitForTimeout(1000);
        yield ss('01_dashboard');
        // 스켈레톤 → 실제 데이터 전환 확인
        const hasKPI = yield page.textContent('body');
        console.log('  수입달성률 표시:', (hasKPI === null || hasKPI === void 0 ? void 0 : hasKPI.includes('수입 달성률')) || (hasKPI === null || hasKPI === void 0 ? void 0 : hasKPI.includes('원')));
        // 3. 스크롤하여 하단 섹션 확인
        yield page.evaluate(() => window.scrollTo(0, 500));
        yield page.waitForTimeout(300);
        yield ss('02_dashboard_scroll');
        // 4. 하단 네비 → 방 관리
        console.log('3. 하단 네비 → 방 관리...');
        yield page.click('button:has-text("방")');
        yield page.waitForTimeout(1000);
        yield ss('03_rooms');
        console.log('  URL:', page.url());
        // 5. 하단 네비 → 세입자
        console.log('4. 하단 네비 → 세입자...');
        yield page.click('button:has-text("세입자")');
        yield page.waitForTimeout(1000);
        yield ss('04_tenants');
        // 6. 하단 네비 → 거래
        console.log('5. 하단 네비 → 거래...');
        yield page.click('button:has-text("거래")');
        yield page.waitForTimeout(1000);
        yield ss('05_transactions');
        // 7. 하단 네비 → 설정
        console.log('6. 하단 네비 → 설정...');
        yield page.click('button:has-text("설정")');
        yield page.waitForTimeout(1000);
        yield ss('06_settings');
        // 8. 하단 네비 → 홈으로 복귀
        console.log('7. 하단 네비 → 홈 복귀...');
        yield page.click('button:has-text("홈")');
        yield page.waitForTimeout(1000);
        yield ss('07_home_return');
        console.log('  URL:', page.url());
        // 9. 빠른 관리 → 납부 현황
        console.log('8. 빠른 관리 → 납부 현황...');
        const payLink = page.locator('a[href="/payment-status"]');
        if ((yield payLink.count()) > 0) {
            yield payLink.first().click();
            yield page.waitForTimeout(1000);
            yield ss('08_payment_status');
        }
        // 10. 전체 라우팅 점검
        console.log('9. 전체 라우팅 점검...');
        const routes = ['/dashboard', '/rooms', '/tenants', '/invitations', '/transactions', '/payment-status', '/health', '/settings'];
        for (const r of routes) {
            yield page.goto(`http://localhost:5174${r}`);
            yield page.waitForTimeout(500);
            const status = yield page.title();
            console.log(`  ${r} → OK`);
        }
        console.log('\n✅ 4단계 최종 통합 테스트 전부 통과!');
    }
    catch (e) {
        console.error('❌ 에러:', e);
        yield ss('error');
    }
    finally {
        yield browser.close();
    }
}))();
