import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../utils/env';
import { IAP } from '@apps-in-toss/web-framework';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 상품 정보 조회하여 무료 체험 또는 신규 구독 할인 offerId 가져오기
      let targetOfferId: string | undefined = undefined;
      try {
        console.log('[IAP] getProductItemList 호출 시작...');
        const productList = await IAP.getProductItemList();
        console.log('[IAP] getProductItemList 결과:', JSON.stringify(productList, null, 2));
        
        if (productList && productList.products) {
          const product = (productList.products as any[]).find((p: any) => p.sku === 'sub.lsn.mp4r1dbe.da0056d3c5');
          console.log('[IAP] 매칭된 상품:', JSON.stringify(product, null, 2));
          
          if (product && product.type === 'SUBSCRIPTION') {
            console.log('[IAP] 구독 상품 offers:', JSON.stringify(product.offers, null, 2));
            
            if (product.offers && product.offers.length > 0) {
              const freeTrialOffer = product.offers.find((o: any) => o.type === 'FREE_TRIAL');
              const newSubOffer = product.offers.find((o: any) => o.type === 'NEW_SUBSCRIPTION');
              console.log('[IAP] FREE_TRIAL offer:', JSON.stringify(freeTrialOffer, null, 2));
              console.log('[IAP] NEW_SUBSCRIPTION offer:', JSON.stringify(newSubOffer, null, 2));
              
              targetOfferId = freeTrialOffer?.offerId || newSubOffer?.offerId || product.offers[0].offerId;
              console.log('[IAP] 선택된 offerId:', targetOfferId);
            } else {
              console.warn('[IAP] 구독 상품에 offers가 비어있음');
            }
          }
        } else {
          console.warn('[IAP] productList가 없거나 products가 비어있음:', productList);
        }
      } catch (e) {
        console.error('[IAP] offerId 조회 실패, 기본 가격으로 진행:', e);
      }
      
      console.log('[IAP] 최종 offerId:', targetOfferId, '| offerId 전달 여부:', !!targetOfferId);

      const orderOptions: any = {
        sku: 'sub.lsn.mp4r1dbe.da0056d3c5',
        processProductGrant: async ({ orderId, subscriptionId }: any) => {
          const res = await apiFetch('/api/users/upgrade', {
            method: 'POST',
            body: JSON.stringify({ orderId, subscriptionId }),
          });
          const data = await res.json();
          return data.success;
        },
      };
      if (targetOfferId) {
        orderOptions.offerId = targetOfferId;
      }

      const cleanup = IAP.createSubscriptionPurchaseOrder({
        options: orderOptions,
        onEvent: () => {
          alert('프리미엄 혜택이 성공적으로 적용되었습니다! 🎉');
          setIsProcessing(false);
          onSuccess();
          onClose();
          cleanup();
        },
        onError: (error) => {
          console.error('결제 실패:', error);
          alert('결제가 취소되었거나 실패했습니다.');
          setIsProcessing(false);
          cleanup();
        },
      });
    } catch (error) {
      console.error('결제 프로세스 시작 실패:', error);
      alert('결제 창을 열 수 없습니다.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '360px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'upgradeDialogIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            background: '#EBF4FF',
            padding: '14px 20px',
            textAlign: 'center',
            borderBottom: '1px solid #D6E4FF',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🏆</span>
          <span style={{ color: '#3182f6', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>
            프리미엄 전용 혜택
          </span>
        </div>

        {/* 바디 */}
        <div style={{ padding: '24px 20px' }}>
          {/* 타이틀 */}
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#191F28',
              lineHeight: 1.4,
              textAlign: 'center',
              margin: '0 0 20px 0',
            }}
          >
            체크인 사장님 프리미엄 구독
            <br />
            <span style={{ color: '#3182f6' }}>(월 4,900원)</span>
          </h2>

          {/* 프로모션 배지 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #3182f6, #6366f1)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                padding: '6px 16px',
                borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(49,130,246,0.3)',
              }}
            >
              🎁 지금 시작하면 2주 무료 체험!
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#3182f6', margin: 0 }}>
              🎉 첫 달 특별 할인 (월 9,790원 → 4,900원)
            </p>
          </div>

          {/* 혜택 리스트 */}
          <div
            style={{
              background: '#F8F9FA',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {[
              '방 개수 무제한 등록 및 관리',
              '초대코드 무제한 생성',
              '전문적인 임대 관리 리포트 제공',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>✅</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#333D4B' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* 버튼 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                background: isProcessing ? '#D1D6DB' : '#3182f6',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                boxShadow: isProcessing ? 'none' : '0 4px 16px rgba(49,130,246,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {isProcessing ? '요청 중...' : '2주 무료로 프리미엄 시작하기'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                border: 'none',
                background: 'transparent',
                color: '#8B95A1',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              다음에 할게요
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes upgradeDialogIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
