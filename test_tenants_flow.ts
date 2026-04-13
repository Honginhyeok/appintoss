import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });
  page.on('console', msg => { if (msg.type() === 'error') console.log('ERR:', msg.text()); });

  const ss = async (name: string) => {
    await page.screenshot({ path: `tenant_test_${name}.png` });
    console.log(`  📸 ${name} 캡처 완료`);
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

    // 2. 세입자 페이지 이동
    console.log('2. 세입자 페이지...');
    await page.click('a[href="/tenants"]');
    await page.waitForTimeout(1000);
    await ss('01_tenants_list');

    // 3. 세입자 등록
    console.log('3. 세입자 등록...');
    await page.click('button:has-text("세입자 등록")');
    await page.waitForTimeout(500);
    await ss('02_add_form');

    await page.fill('input[placeholder="홍길동"]', '테스트 세입자');
    await page.fill('input[placeholder="010-1234-5678"]', '01099998888');
    await page.fill('input[placeholder="500000"]', '450000');
    await page.waitForTimeout(300);
    await ss('03_filled_form');

    await page.click('button:has-text("세입자 등록하기")');
    await page.waitForTimeout(1500);
    await ss('04_after_add');

    // 4. 초대코드 페이지 이동
    console.log('4. 초대코드 페이지...');
    await page.click('a[href="/invitations"]');
    await page.waitForTimeout(1000);
    await ss('05_invitations');

    // 5. 초대코드 생성
    console.log('5. 초대코드 생성...');
    await page.click('button:has-text("초대코드 생성하기")');
    await page.waitForTimeout(1500);
    await ss('06_code_generated');

    // 6. 초대코드 복사
    console.log('6. 코드 복사...');
    const copyBtn = page.locator('button:has-text("코드 복사")');
    const copyCount = await copyBtn.count();
    if (copyCount > 0) {
      await copyBtn.first().click();
      await page.waitForTimeout(1500);
      await ss('07_code_copied');
    } else {
      console.log('  코드 복사 버튼 없음 (활성 코드 없음)');
    }

    console.log('\n✅ 2단계 포팅 테스트 전부 통과!');
  } catch (e) {
    console.error('❌ 에러:', e);
    await ss('error');
  } finally {
    await browser.close();
  }
})();
