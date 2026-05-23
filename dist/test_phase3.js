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
        yield page.screenshot({ path: `phase3_${name}.png` });
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
        // 2. 거래 내역 페이지
        console.log('2. 거래 내역 페이지...');
        yield page.click('a[href="/transactions"]');
        yield page.waitForTimeout(1000);
        yield ss('01_transactions_empty');
        // 3. 거래 기록 추가
        console.log('3. 거래 기록 추가...');
        yield page.click('button:has-text("기록")');
        yield page.waitForTimeout(500);
        yield ss('02_tx_form');
        yield page.fill('input[placeholder="500000"]', '480000');
        yield page.fill('input[placeholder="예: 홍길동 월세 수납"]', '테스트 세입자 월세 수납');
        yield page.waitForTimeout(300);
        yield ss('03_tx_filled');
        yield page.click('button:has-text("거래 기록하기")');
        yield page.waitForTimeout(1500);
        yield ss('04_tx_added');
        // 4. 납부 현황 페이지
        console.log('4. 납부 현황 페이지...');
        yield page.click('a[href="/payment-status"]');
        yield page.waitForTimeout(1000);
        yield ss('05_payment_status');
        // 5. 자가 진단 페이지
        console.log('5. 자가 진단(HealthCheck) 페이지...');
        yield page.goto('http://localhost:5174/health');
        yield page.waitForTimeout(1000);
        yield ss('06_health_before');
        yield page.click('button:has-text("전체 진단 시작")');
        // 최대 15초 대기 (SDK 로딩 포함)
        yield page.waitForTimeout(8000);
        yield ss('07_health_result');
        // 진단 결과 확인
        const passText = yield page.textContent('body');
        const allPass = passText === null || passText === void 0 ? void 0 : passText.includes('모든 시스템 정상');
        console.log(`\n  진단 결과: ${allPass ? '✅ 전부 정상' : '⚠️ 일부 오류 (스크린샷 확인)'}`);
        console.log('\n✅ 3단계 포팅 테스트 완료!');
    }
    catch (e) {
        console.error('❌ 에러:', e);
        yield ss('error');
    }
    finally {
        yield browser.close();
    }
}))();
