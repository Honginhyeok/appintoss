import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import type { PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initializeWidget = async () => {
      try {
        const widget = await loadPaymentWidget(
          "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq",
          "ANONYMOUS"
        );
        paymentWidgetRef.current = widget;
        
        // 런칭 특가 4900원 렌더링
        widget.renderPaymentMethods('#payment-method-container', { value: 4900 });
        setIsWidgetLoaded(true);
      } catch (e) {
        console.error('결제 위젯 로드 실패:', e);
      }
    };

    initializeWidget();
  }, [isOpen]);

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. 토스페이먼츠 위젯 가상 결제 호출 (PG)
      await paymentWidgetRef.current.requestPayment({
        orderId: `order_${Math.random().toString(36).substring(2, 10)}`,
        orderName: '프리미엄 요금제 (방 개수 무제한)',
        successUrl: window.location.origin + '/pg/success',
        failUrl: window.location.origin + '/pg/fail',
        customerEmail: 'customer@example.com',
        customerName: '임대인(사장님)',
      });

      // 가상 결제창 특성상 successUrl로 리다이렉트 되기 전에 이 로직이 실행될 수 있습니다. (모의 테스트용)
      // 실제 브라우저에서는 Redirect 되지만, 인앱 혹은 결제창 완료 시점에 맞춰 백엔드 연동을 진행합니다.
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('결제 실패:', error);
      alert('결제가 취소되었거나 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl w-full max-w-md mx-auto overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 플래그 */}
        <div className="bg-blue-50 py-3 px-6 text-center border-b border-blue-100 flex items-center justify-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="text-blue-600 font-bold text-sm tracking-wide">프리미엄 전용 혜택</span>
        </div>

        {/* 바디 영역 */}
        <div className="p-6">
          <h2 className="text-[22px] font-bold text-gray-900 leading-snug tracking-tight mb-2 text-center">
            더 많은 방을<br/>무제한으로 관리해 보세요
          </h2>
          
          {/* 가격 앵커링 */}
          <div className="flex flex-col items-center my-6 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 line-through font-medium text-lg">월 9,900원</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-500 font-bold text-xs rounded-full">50% 할인</span>
            </div>
            <div className="text-4xl font-extrabold text-blue-600">
              월 4,900원
            </div>
            <p className="text-sm font-medium text-blue-500 mt-2 tracking-tight">🎉 런칭 기념 평생 할인 이벤트 중!</p>
          </div>

          {/* 혜택 리스트 (ListRow) */}
          <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✅</div>
              <span className="text-gray-700 font-medium text-[15px]">방 개수 무제한 등록 및 관리</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✅</div>
              <span className="text-gray-700 font-medium text-[15px]">세입자 입금 자동 확인 알림</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✅</div>
              <span className="text-gray-700 font-medium text-[15px]">전문적인 임대 관리 리포트 제공</span>
            </div>
          </div>

          {/* PG 결제 영역 */}
          <div id="payment-method-container" className="w-full min-h-[150px]"></div>

          <div className="flex flex-col gap-3 mt-4">
            <button 
              onClick={handlePayment} 
              disabled={!isWidgetLoaded || isProcessing}
              className="w-full bg-blue-600 text-white font-bold text-[17px] py-4 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isProcessing ? '요청 중...' : '4,900원 정기결제 시작하기'}
            </button>
            <button 
              onClick={onClose} 
              className="w-full text-gray-500 font-medium text-[15px] py-3 hover:text-gray-700"
            >
              다음에 할게요
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
