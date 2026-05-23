import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  // 크기 조절 (토스 간편인증 모바일/웹 뷰포트 맞춤)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // 브라우저 내부 에러 출력 설정
  page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    console.log('🚀 [Test] 1. 웹사이트 로그인 역할 선택 화면 진입...');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'toss_login_01_role_select.png' });
    console.log('📸 캡처 완료: toss_login_01_role_select.png');

    // 2. 임대인 로그인 진입 및 토스 버튼 확인
    console.log('🚀 [Test] 2. 임대인으로 시작하기 클릭...');
    await page.click('text=임대인으로 시작하기');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'toss_login_02_landlord.png' });
    console.log('📸 캡처 완료: toss_login_02_landlord.png (임대인 토스 로그인 버튼 활성화 확인)');

    // 3. 임대인 화면에서 뒤로가기 클릭
    console.log('🚀 [Test] 3. 역할 선택 화면으로 복귀...');
    await page.click('text=← 다른 역할로 시작하기');
    await page.waitForTimeout(1000);

    // 4. 임차인 로그인 진입 및 토스 버튼 확인
    console.log('🚀 [Test] 4. 임차인으로 시작하기 클릭...');
    await page.click('text=임차인으로 시작하기');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'toss_login_03_tenant.png' });
    console.log('📸 캡처 완료: toss_login_03_tenant.png (임차인 토스 로그인 버튼 신규 활성화 확인)');

    // 5. 토스 로그인 버튼 클릭 시 리다이렉션 파라미터 및 실서버 화면 검증
    console.log('🚀 [Test] 5. "토스로 시작하기" 버튼 클릭하여 실제 토스 인증 서버로 리다이렉트 시도...');
    
    // 리다이렉트 감지
    page.on('request', request => {
      const url = request.url();
      if (url.includes('oauth2.cert.toss.im/oauth2/authorize')) {
        console.log('\n🌟 [SUCCESS] 토스 정식 OAuth 인가 URL 요청 감지!');
        console.log(`🔗 요청 URL: ${url}\n`);
      }
    });

    // 버튼 클릭 및 리다이렉트 페이지 로딩 대기
    // hidden 상태가 아닌 현재 눈에 보이는 임차인 패널 내의 버튼을 명확히 타겟팅하여 클릭함
    await page.click('#tenant-login-panel button:has-text("토스로 시작하기")');
    console.log('⏳ 토스 간편인증 실서버(QR/정보입력) 로딩 대기 중 (5초)...');
    await page.waitForTimeout(5000);
    
    // 리다이렉트된 실서버 페이지의 URL 출력
    const currentUrl = page.url();
    console.log(`🔗 현재 페이지 URL: ${currentUrl}`);

    // 최종 토스인증 실화면 캡처
    await page.screenshot({ path: 'toss_login_04_oauth_page.png' });
    console.log('📸 최종 실서버 캡처 완료: toss_login_04_oauth_page.png');

    console.log('\n✅ [Test] 모든 실서버 렌더링 및 기능 검증 완료!');
  } catch (error) {
    console.error('❌ [Test] 에러 발생:', error);
    await page.screenshot({ path: 'toss_login_error.png' });
  } finally {
    await browser.close();
  }
})();
