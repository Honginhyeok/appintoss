import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    // 로컬 파일 열기 (이 파일에서 '취 soul' 오타가 발견됨)
    await page.goto('file:///c:/Users/inheu/hostel%20managing%20Website/downloaded_index.html');
    
    // 강제로 방 추가 모달을 열기
    await page.evaluate(() => {
      // old JS legacy function 
      if (typeof window.openModal === 'function') {
        window.openModal('room-modal');
      } else {
        const modal = document.getElementById('room-modal');
        if (modal) {
          modal.classList.remove('hidden');
          modal.style.display = 'flex';
        }
      }
    });

    await page.waitForTimeout(500); // 렌더링 대기
    
    // 확인용 스크린샷 캡처
    await page.screenshot({ path: 'room_modal_fixed.png' });
    console.log('📸 스크린샷 캡처 완료: room_modal_fixed.png');
    
    const cancelText = await page.textContent('#room-modal .btn-ghost');
    console.log(`모달 내 취소 버튼 텍스트 실제 확인: "${cancelText?.trim()}"`);

  } catch (e) {
    console.error('❌ 에러:', e);
  } finally {
    await browser.close();
  }
})();
