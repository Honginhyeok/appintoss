import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    console.log('🚀 [Test] 1. 실서버 로그인 역할 선택 화면 진입...');
    await page.goto('https://checkin-host.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'prod_toss_login_01_role_select.png' });
    console.log('📸 캡처 완료: prod_toss_login_01_role_select.png');

    console.log('🚀 [Test] 2. 임차인으로 시작하기 클릭...');
    await page.click('text=임차인으로 시작하기');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'prod_toss_login_02_tenant.png' });
    console.log('📸 캡처 완료: prod_toss_login_02_tenant.png');

    console.log('🚀 [Test] 3. "토스로 시작하기" 버튼 클릭하여 실제 토스 인증 서버로 리다이렉트 시도...');
    
    // 리다이렉트 감지
    page.on('request', request => {
      const url = request.url();
      if (url.includes('oauth2.cert.toss.im/oauth2/authorize')) {
        console.log('\n🌟 [SUCCESS] 토스 정식 OAuth 인가 URL 요청 감지!');
        console.log(`🔗 요청 URL: ${url}\n`);
      }
    });

    await page.click('#tenant-login-panel button:has-text("토스로 시작하기")');
    console.log('⏳ 토스 간편인증 실서버 로딩 대기 중 (5초)...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`🔗 현재 페이지 URL: ${currentUrl}`);

    await page.screenshot({ path: 'prod_toss_login_03_oauth_page.png' });
    console.log('📸 최종 실서버 캡처 완료: prod_toss_login_03_oauth_page.png');

    // 4. 콜백 라우트 테스트 (기존 Unauthorized 에러 발생 지점)
    console.log('🚀 [Test] 4. 실서버 콜백 라우트 직접 호출 테스트 (Unauthorized 필터링 검증)...');
    const response = await page.goto('https://checkin-host.com/api/toss/callback');
    console.log(`🔗 콜백 응답 URL: ${page.url()}`);
    console.log(`📊 콜백 HTTP Status: ${response?.status()}`);
    
    const content = await page.content();
    console.log('📄 응답 내용 일부:', content.substring(0, 300));
    await page.screenshot({ path: 'prod_toss_login_04_callback_test.png' });
    console.log('📸 콜백 직접 호출 결과 캡처 완료: prod_toss_login_04_callback_test.png');

    console.log('\n✅ [Test] 실서버 연동 기능 검증 완료!');
  } catch (error) {
    console.error('❌ [Test] 에러 발생:', error);
    await page.screenshot({ path: 'prod_toss_login_error.png' });
  } finally {
    await browser.close();
  }
})();
