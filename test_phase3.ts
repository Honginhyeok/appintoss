import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });

  const ss = async (name: string) => {
    await page.screenshot({ path: `phase3_${name}.png` });
    console.log(`  📸 ${name}`);
  };

  try {
    // 1. 로그인
    console.log('1. 로그인...');
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    await page.click('text=임대인으로 시작하기');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="아이디를 입력하세요"]', 'admin');
    await page.fill('input[placeholder="비밀번호를 입력하세요"]', 'admin123');
    await page.click('button:has-text("로그인")');
    await page.waitForTimeout(2000);
    console.log('  URL:', page.url());

    // 2. 거래 내역 페이지
    console.log('2. 거래 내역 페이지...');
    await page.click('a[href="/transactions"]');
    await page.waitForTimeout(1000);
    await ss('01_transactions_empty');

    // 3. 거래 기록 추가
    console.log('3. 거래 기록 추가...');
    await page.click('button:has-text("기록")');
    await page.waitForTimeout(500);
    await ss('02_tx_form');

    await page.fill('input[placeholder="500000"]', '480000');
    await page.fill('input[placeholder="예: 홍길동 월세 수납"]', '테스트 세입자 월세 수납');
    await page.waitForTimeout(300);
    await ss('03_tx_filled');

    await page.click('button:has-text("거래 기록하기")');
    await page.waitForTimeout(1500);
    await ss('04_tx_added');

    // 4. 납부 현황 페이지
    console.log('4. 납부 현황 페이지...');
    await page.click('a[href="/payment-status"]');
    await page.waitForTimeout(1000);
    await ss('05_payment_status');

    // 5. 자가 진단 페이지
    console.log('5. 자가 진단(HealthCheck) 페이지...');
    await page.goto('http://localhost:5174/health');
    await page.waitForTimeout(1000);
    await ss('06_health_before');

    await page.click('button:has-text("전체 진단 시작")');
    // 최대 15초 대기 (SDK 로딩 포함)
    await page.waitForTimeout(8000);
    await ss('07_health_result');

    // 진단 결과 확인
    const passText = await page.textContent('body');
    const allPass = passText?.includes('모든 시스템 정상');
    console.log(`\n  진단 결과: ${allPass ? '✅ 전부 정상' : '⚠️ 일부 오류 (스크린샷 확인)'}`);

    console.log('\n✅ 3단계 포팅 테스트 완료!');
  } catch (e) {
    console.error('❌ 에러:', e);
    await ss('error');
  } finally {
    await browser.close();
  }
})();
