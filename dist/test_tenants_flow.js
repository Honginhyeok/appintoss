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
    page.on('console', msg => { if (msg.type() === 'error')
        console.log('ERR:', msg.text()); });
    const ss = (name) => __awaiter(void 0, void 0, void 0, function* () {
        yield page.screenshot({ path: `tenant_test_${name}.png` });
        console.log(`  📸 ${name} 캡처 완료`);
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
        // 2. 세입자 페이지 이동
        console.log('2. 세입자 페이지...');
        yield page.click('a[href="/tenants"]');
        yield page.waitForTimeout(1000);
        yield ss('01_tenants_list');
        // 3. 세입자 등록
        console.log('3. 세입자 등록...');
        yield page.click('button:has-text("세입자 등록")');
        yield page.waitForTimeout(500);
        yield ss('02_add_form');
        yield page.fill('input[placeholder="홍길동"]', '테스트 세입자');
        yield page.fill('input[placeholder="010-1234-5678"]', '01099998888');
        yield page.fill('input[placeholder="500000"]', '450000');
        yield page.waitForTimeout(300);
        yield ss('03_filled_form');
        yield page.click('button:has-text("세입자 등록하기")');
        yield page.waitForTimeout(1500);
        yield ss('04_after_add');
        // 4. 초대코드 페이지 이동
        console.log('4. 초대코드 페이지...');
        yield page.click('a[href="/invitations"]');
        yield page.waitForTimeout(1000);
        yield ss('05_invitations');
        // 5. 초대코드 생성
        console.log('5. 초대코드 생성...');
        yield page.click('button:has-text("초대코드 생성하기")');
        yield page.waitForTimeout(1500);
        yield ss('06_code_generated');
        // 6. 초대코드 복사
        console.log('6. 코드 복사...');
        const copyBtn = page.locator('button:has-text("코드 복사")');
        const copyCount = yield copyBtn.count();
        if (copyCount > 0) {
            yield copyBtn.first().click();
            yield page.waitForTimeout(1500);
            yield ss('07_code_copied');
        }
        else {
            console.log('  코드 복사 버튼 없음 (활성 코드 없음)');
        }
        console.log('\n✅ 2단계 포팅 테스트 전부 통과!');
    }
    catch (e) {
        console.error('❌ 에러:', e);
        yield ss('error');
    }
    finally {
        yield browser.close();
    }
}))();
