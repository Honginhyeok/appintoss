import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import type { PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { BottomSheet, Button } from './tds';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  // PG (Toss Payments Widget) 연동 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    const initializeWidget = async () => {
      try {
        // 토스페이먼츠 연동 가이드라인용 기본 테스트 키 (Client Key)
        const widget = await loadPaymentWidget(
          "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq", 
          "ANONYMOUS" // 비회원 결제 방식 또는 고객 ID
        );
        paymentWidgetRef.current = widget;
        
        // 결제 위젯 렌더링 (구독료 9900원 고정)
        widget.renderPaymentMethods('#payment-method-container', { value: 9900 });
        setIsWidgetLoaded(true);
      } catch (e) {
        console.error('결제 위젯을 불러오지 못했습니다.', e);
      }
    };

    initializeWidget();
  }, [isOpen]);

  const handleSubscribe = async () => {
    if (!paymentWidgetRef.current) return;

    try {
      // 결제창(모듈) 오픈 호출
      await paymentWidgetRef.current.requestPayment({
        orderId: `order_${Math.random().toString(36).substring(2, 10)}`, // 고유 주문번호 생성기
        orderName: '프리미엄 요금제 (방 4개 이상 무제한 관리)',
        successUrl: window.location.origin + '/pg/success',
        failUrl: window.location.origin + '/pg/fail',
        customerEmail: 'customer@example.com',
        customerName: '임대인(사장님) 사용자',
      });
    } catch (error) {
      console.error('결제 실패:', error);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="프리미엄 요금제 업그레이드">
      <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#191f28', marginBottom: '8px' }}>
          더 많은 방을 관리해 보세요!
        </h3>
        <p style={{ fontSize: '14px', color: '#4e5968', lineHeight: '1.5' }}>
          방을 4개 이상 관리하시려면<br/>
          <strong>프리미엄 요금제(월 9,900원)</strong>가 필요해요.
        </p>
      </div>

      {/* 토스페이먼츠 SDK에서 주입하는 iframe이 렌더링되는 빈 공간 */}
      <div id="payment-method-container" style={{ width: '100%', minHeight: '150px' }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        <Button variant="primary" onClick={handleSubscribe} disabled={!isWidgetLoaded}>
          프리미엄 결제하기
        </Button>
        <Button variant="secondary" onClick={onClose} style={{ background: 'transparent' }}>
          나중에 하기
        </Button>
      </div>
    </BottomSheet>
  );
}
