import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  // 고해상도 iPhone 14 Pro Max 느낌의 뷰포트
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  const page = await context.newPage();

  const takeConfiguredScreenshot = async (name: string, delay = 500) => {
    // Hide scrollbars for cleaner promo look
    await page.addStyleTag({ content: '::-webkit-scrollbar { display: none; }' });
    await page.waitForTimeout(delay);
    await page.screenshot({ path: `promo_${name}.png` });
    console.log(`📸 프로모션 샷 저장 완료: promo_${name}.png`);
  };

  try {
    // 1. 로그인 성공 직후 대시보드 진입
    await page.goto('http://localhost:5173/login');
    await page.click('text=임대인으로 시작하기');
    await page.fill('input[placeholder="아이디를 입력하세요"]', 'admin');
    await page.fill('input[placeholder="비밀번호를 입력하세요"]', 'admin1');
    await page.click('button:has-text("로그인")');
    await page.waitForTimeout(2000); // 대시보드 로딩

    // 프로모션용 DOM 조작 (더 예쁜 숫자, 꽉 찬 느낌)
    await page.evaluate(() => {
      // 대시보드 카드류 조작
      const heroAmount = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('원') && el.tagName === 'H2');
      if (heroAmount) heroAmount.textContent = '14,850,000원';
      
      const kpis = document.querySelectorAll('.font-bold');
      kpis.forEach(el => {
        if (el.textContent === '0/0') el.textContent = '24/25';
        if (el.textContent === '0원') el.textContent = '1,200,000원';
      });

      const titles = document.querySelectorAll('.text-sm');
      titles.forEach(el => {
        if (el.textContent === '미납') el.textContent = '미납 (2명)';
      });
    });
    
    await takeConfiguredScreenshot('01_dashboard_main');

    // 2. 대시보드 스크롤 (빠른 관리 & 최근 거래)
    await page.evaluate(() => window.scrollTo(0, 400));
    await takeConfiguredScreenshot('02_dashboard_scroll');

    // 3. 방 관리 페이지 (리스트 있는 것처럼 조작)
    await page.goto('http://localhost:5173/rooms');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
        const noRooms = Array.from(document.querySelectorAll('*')).find(el => el.textContent === '아직 등록된 방이 없습니다.');
        if (noRooms && noRooms.parentElement) {
            noRooms.parentElement.innerHTML = `
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 16px; background-color: #fff; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 16px; font-weight: bold; display: flex; justify-content: space-between;">
                        <span>🏠 501호 (투룸)</span> <span style="color: #3182f6;">완납</span>
                    </li>
                    <li style="padding: 16px; background-color: #fff; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 16px; font-weight: bold; display: flex; justify-content: space-between;">
                        <span>🏠 502호 (원룸)</span> <span style="color: #f04452;">미납</span>
                    </li>
                    <li style="padding: 16px; background-color: #fff; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 16px; font-weight: bold; display: flex; justify-content: space-between;">
                        <span>🏠 503호 (오피스텔)</span> <span style="color: #3182f6;">완납</span>
                    </li>
                </ul>
            `;
        }
    });
    await takeConfiguredScreenshot('03_rooms_list');

    // 4. 납부 현황 페이지
    await page.goto('http://localhost:5173/payment-status');
    await page.waitForTimeout(1000);
    await takeConfiguredScreenshot('04_payment_status');
    
  } catch(e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
