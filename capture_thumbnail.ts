import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1932, height: 828 } });
  const page = await context.newPage();

  console.log('이미지 인코딩 중...');
  // 이미 캡처해 둔 고품질 프로모션 이미지를 불러와서 base64로 변환합니다.
  const getImage = (name: string) => {
    try {
      return fs.readFileSync(path.join(__dirname, `promo_${name}.png`), 'base64');
    } catch {
      return '';
    }
  };

  const img1 = getImage('01_dashboard_main');
  const img2 = getImage('04_payment_status');
  const img3 = getImage('03_rooms_list');

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body { margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; overflow: hidden; background: #f2f4f6; }
        .banner {
          width: 1932px; 
          height: 828px; 
          background: linear-gradient(120deg, #1b64da 0%, #449bf9 100%); 
          position: relative; 
          overflow: hidden; 
        }
        
        /* 백그라운드 디자인 데코레이션 */
        .deco-circle-1 {
          position: absolute; width: 800px; height: 800px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%);
          top: -200px; right: -100px;
        }
        .deco-circle-2 {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
          bottom: -200px; left: 100px;
        }

        .text-content {
          position: absolute; 
          left: 140px; 
          top: 240px; 
          color: #ffffff;
          z-index: 10;
        }
        h1 {
          font-size: 86px; 
          font-weight: 800; 
          line-height: 1.25; 
          margin: 0; 
          letter-spacing: -2.5px;
          text-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        p {
          font-size: 38px; 
          font-weight: 500; 
          opacity: 0.95; 
          margin-top: 32px; 
          line-height: 1.5; 
          letter-spacing: -1.5px;
        }
        .badge {
          margin-top: 60px; 
          display: inline-flex; 
          align-items: center;
          background: rgba(255,255,255,0.15); 
          padding: 16px 36px; 
          border-radius: 50px; 
          font-size: 26px; 
          font-weight: 700; 
          letter-spacing: -0.5px;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        /* 폰 목업 CSS */
        .phone {
          position: absolute;
          width: 340px; 
          height: 740px;
          border-radius: 46px;
          box-shadow: -20px 30px 60px rgba(0,0,0,0.4), inset 0 0 0 12px #191f28;
          overflow: hidden;
          background: #fff;
          border: 14px solid #191f28;
          box-sizing: border-box;
        }

        /* Dynamic notch */
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

        /* Phones Positioning */
        .phone-1 { /* Main Dashboard - Center */
          right: 360px; 
          top: 140px; 
          z-index: 3; 
        }
        .phone-2 { /* Payment Status - Left Back */
          right: 680px; 
          top: 80px; 
          z-index: 2; 
          transform: scale(0.85) rotate(-8deg); 
          opacity: 0.9;
        }
        .phone-3 { /* Rooms List - Right Back */
          right: 50px; 
          top: 220px; 
          z-index: 1; 
          transform: scale(0.85) rotate(8deg); 
          opacity: 0.85;
        }

        .img-inner { width: 100%; transform: scale(1.01); transform-origin: top left; }
      </style>
    </head>
    <body>
      <div class="banner">
        <div class="deco-circle-1"></div>
        <div class="deco-circle-2"></div>
        
        <div class="text-content">
          <h1>
            숙소 관리를<br/>가장 쉽고 편안하게.
          </h1>
          <p>
            수납 자동화부터 입주자 소통 게시판까지<br/>
            원룸 사장님을 위한 토스 미니앱
          </p>
          <div class="badge">
            🏠 체크인사장님  ✕  앱인토스
          </div>
        </div>

        <div class="phone phone-2">
          <img class="img-inner" src="data:image/png;base64,${img2}" />
        </div>
        
        <div class="phone phone-3">
          <img class="img-inner" src="data:image/png;base64,${img3}" />
        </div>

        <div class="phone phone-1">
          <img class="img-inner" src="data:image/png;base64,${img1}" />
        </div>
      </div>
    </body>
    </html>
  `;

  console.log('뷰포트 HTML 로드 및 렌더링 중...');
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // 폰트 및 렌더링 대기
  
  const targetPath = 'promo_thumbnail_1932x828.png';
  await page.screenshot({ path: targetPath });
  console.log(`✅ 고화질 마케팅 섬네일 생성 완료: ${targetPath}`);

  await browser.close();
})();
