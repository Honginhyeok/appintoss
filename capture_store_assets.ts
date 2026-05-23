import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });

  const getImage = (name: string) => {
    try {
      return fs.readFileSync(path.join(__dirname, `promo_${name}.png`), 'base64');
    } catch {
      return '';
    }
  };

  const imgDash = getImage('01_dashboard_main');
  const imgRooms = getImage('03_rooms_list');
  const imgPay = getImage('04_payment_status');

  const baseCss = `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    body { margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; overflow: hidden; background: #f2f4f6; }
    
    .phone {
      position: absolute;
      box-shadow: 0 40px 80px rgba(0,0,0,0.3), inset 0 0 0 14px #191f28;
      overflow: hidden;
      background: #fff;
      border: 18px solid #191f28;
      box-sizing: border-box;
    }
    .phone::before {
      content: '';
      position: absolute;
      top: 0; left: 50%;
      transform: translateX(-50%);
      width: 120px; height: 28px;
      background: #191f28;
      border-bottom-left-radius: 18px;
      border-bottom-right-radius: 18px;
      z-index: 100;
    }
    .img-inner { width: 100%; transform: scale(1.01); transform-origin: top left; }
  `;

  // --- 세로형 (Vertical) 636x1048 생성 렌더 함수 --- //
  const captureVertical = async (title: string, sub: string, imgB64: string, filename: string, isBlue: boolean) => {
    const page = await browser.newPage({ viewport: { width: 636, height: 1048 } });
    const bg = isBlue 
      ? 'linear-gradient(to bottom, #1b64da, #449bf9)' 
      : 'linear-gradient(to bottom, #0f172a, #1e293b)';

    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <style>
          ${baseCss}
          .v-banner {
            width: 636px; height: 1048px; background: ${bg};
            position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding-top: 100px;
          }
          .text-center { text-align: center; color: #fff; z-index: 10; }
          h1 { font-size: 56px; font-weight: 800; margin: 0; letter-spacing: -2px; }
          p { font-size: 26px; font-weight: 500; margin-top: 24px; opacity: 0.9; letter-spacing: -1px; }
          .v-phone {
            width: 480px; height: 960px; border-radius: 64px;
            bottom: -140px;
          }
        </style>
      </head>
      <body>
        <div class="v-banner">
          <div class="text-center">
            <h1>${title}</h1>
            <p>${sub}</p>
          </div>
          <div class="phone v-phone">
             <img class="img-inner" src="data:image/png;base64,${imgB64}" />
          </div>
        </div>
      </body>
      </html>
    `;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: filename });
    console.log(`✅ 세로형 완성: ${filename}`);
    await page.close();
  };

  // --- 가로형 (Horizontal) 1504x741 생성 렌더 함수 --- //
  const captureHorizontal = async (filename: string) => {
    const page = await browser.newPage({ viewport: { width: 1504, height: 741 } });
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <style>
          ${baseCss}
          .h-banner {
            width: 1504px; height: 741px; background: linear-gradient(135deg, #1b64da 0%, #3182f6 100%);
            position: relative; overflow: hidden; 
          }
          .text-content { position: absolute; left: 100px; top: 200px; color: #ffffff; z-index: 10; }
          h1 { font-size: 72px; font-weight: 800; line-height: 1.25; margin: 0; letter-spacing: -2.5px; }
          p { font-size: 32px; font-weight: 500; opacity: 0.95; margin-top: 24px; line-height: 1.5; letter-spacing: -1px; }
          
          /* Phones Styling Custom */
          .h-phone { width: 320px; height: 680px; border-radius: 46px; border-width: 12px; }
          .hp-1 { right: 280px; top: 120px; z-index: 3; }
          .hp-2 { right: 540px; top: 80px; z-index: 2; transform: scale(0.85) rotate(-6deg); opacity: 0.9; }
          .hp-3 { right: 40px; top: 160px; z-index: 1; transform: scale(0.85) rotate(6deg); opacity: 0.85; }
        </style>
      </head>
      <body>
        <div class="h-banner">
          <div class="text-content">
            <h1>앱인토스의 기준이 될<br/>스마트 원룸 관리.</h1>
            <p>월세 수납부터 소통까지<br/>체크인사장님에서 한 번에</p>
          </div>
          <div class="phone h-phone hp-2">
            <img class="img-inner" src="data:image/png;base64,${imgPay}" />
          </div>
          <div class="phone h-phone hp-3">
            <img class="img-inner" src="data:image/png;base64,${imgRooms}" />
          </div>
          <div class="phone h-phone hp-1">
            <img class="img-inner" src="data:image/png;base64,${imgDash}" />
          </div>
        </div>
      </body>
      </html>
    `;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: filename });
    console.log(`✅ 가로형 완성: ${filename}`);
    await page.close();
  };

  try {
    // 1. 세로 3장 (636x1048)
    await captureVertical('수납 현황이 한눈에', '지금 누가 미납했는지, 똑똑한 데이터', imgDash, 'store_v1_636x1048.png', true);
    await captureVertical('번거로운 독촉은 그만', '토스가 알아서 결제 상태를 분류합니다', imgPay, 'store_v2_636x1048.png', false);
    await captureVertical('체계적인 공실 관리', '모든 호실의 입주와 계약을 스마트하게', imgRooms, 'store_v3_636x1048.png', true);

    // 2. 가로 1장 (1504x741)
    await captureHorizontal('store_h1_1504x741.png');

  } catch(e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
