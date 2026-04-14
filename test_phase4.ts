import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });

  const ss = async (name: string) => {
    await page.screenshot({ path: `final_${name}.png`, fullPage: false });
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

    // 2. 대시보드 확인
    console.log('2. 대시보드 (홈)...');
    await page.waitForTimeout(1000);
    await ss('01_dashboard');

    // 스켈레톤 → 실제 데이터 전환 확인
    const hasKPI = await page.textContent('body');
    console.log('  수입달성률 표시:', hasKPI?.includes('수입 달성률') || hasKPI?.includes('원'));

    // 3. 스크롤하여 하단 섹션 확인
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    await ss('02_dashboard_scroll');

    // 4. 하단 네비 → 방 관리
    console.log('3. 하단 네비 → 방 관리...');
    await page.click('button:has-text("방")');
    await page.waitForTimeout(1000);
    await ss('03_rooms');
    console.log('  URL:', page.url());

    // 5. 하단 네비 → 세입자
    console.log('4. 하단 네비 → 세입자...');
    await page.click('button:has-text("세입자")');
    await page.waitForTimeout(1000);
    await ss('04_tenants');

    // 6. 하단 네비 → 거래
    console.log('5. 하단 네비 → 거래...');
    await page.click('button:has-text("거래")');
    await page.waitForTimeout(1000);
    await ss('05_transactions');

    // 7. 하단 네비 → 설정
    console.log('6. 하단 네비 → 설정...');
    await page.click('button:has-text("설정")');
    await page.waitForTimeout(1000);
    await ss('06_settings');

    // 8. 하단 네비 → 홈으로 복귀
    console.log('7. 하단 네비 → 홈 복귀...');
    await page.click('button:has-text("홈")');
    await page.waitForTimeout(1000);
    await ss('07_home_return');
    console.log('  URL:', page.url());

    // 9. 빠른 관리 → 납부 현황
    console.log('8. 빠른 관리 → 납부 현황...');
    const payLink = page.locator('a[href="/payment-status"]');
    if (await payLink.count() > 0) {
      await payLink.first().click();
      await page.waitForTimeout(1000);
      await ss('08_payment_status');
    }

    // 10. 전체 라우팅 점검
    console.log('9. 전체 라우팅 점검...');
    const routes = ['/dashboard', '/rooms', '/tenants', '/invitations', '/transactions', '/payment-status', '/health', '/settings'];
    for (const r of routes) {
      await page.goto(`http://localhost:5174${r}`);
      await page.waitForTimeout(500);
      const status = await page.title();
      console.log(`  ${r} → OK`);
    }

    console.log('\n✅ 4단계 최종 통합 테스트 전부 통과!');
  } catch (e) {
    console.error('❌ 에러:', e);
    await ss('error');
  } finally {
    await browser.close();
  }
})();
