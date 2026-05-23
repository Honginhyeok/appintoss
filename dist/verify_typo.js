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
    try {
        // 로컬 파일 열기 (이 파일에서 '취 soul' 오타가 발견됨)
        yield page.goto('file:///c:/Users/inheu/hostel%20managing%20Website/downloaded_index.html');
        // 강제로 방 추가 모달을 열기
        yield page.evaluate(() => {
            // old JS legacy function 
            if (typeof window.openModal === 'function') {
                window.openModal('room-modal');
            }
            else {
                const modal = document.getElementById('room-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                }
            }
        });
        yield page.waitForTimeout(500); // 렌더링 대기
        // 확인용 스크린샷 캡처
        yield page.screenshot({ path: 'room_modal_fixed.png' });
        console.log('📸 스크린샷 캡처 완료: room_modal_fixed.png');
        const cancelText = yield page.textContent('#room-modal .btn-ghost');
        console.log(`모달 내 취소 버튼 텍스트 실제 확인: "${cancelText === null || cancelText === void 0 ? void 0 : cancelText.trim()}"`);
    }
    catch (e) {
        console.error('❌ 에러:', e);
    }
    finally {
        yield browser.close();
    }
}))();
