import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../utils/env';
import { IAP } from '@apps-in-toss/web-framework';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [step, setStep] = useState<'PAYMENT' | 'PIN_SETUP'>('PAYMENT');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 동적 가격 정보 상태
  const [pricing, setPricing] = useState<{
    originalPrice: string;
    offerPrice: string | null;
    hasFreeTrial: boolean;
    offerId: string | undefined;
    isLoading: boolean;
  }>({
    originalPrice: '불러오는 중...',
    offerPrice: null,
    hasFreeTrial: false,
    offerId: undefined,
    isLoading: true,
  });

  // 모달이 열릴 때 토스에서 상품/가격 정보 가져오기
  useEffect(() => {
    if (isOpen) {
      const fetchPricing = async () => {
        try {
          const productList = await IAP.getProductItemList();
          if (productList && productList.products) {
            const product = (productList.products as any[]).find((p: any) => p.sku === 'sub.lsn.mq91o1yz.e181446a80');
            if (product && product.type === 'SUBSCRIPTION') {
              const originalPrice = product.displayAmount || '9,790원';
              let offerPrice = null;
              let hasFreeTrial = false;
              let offerId = undefined;

              if (product.offers && product.offers.length > 0) {
                const freeTrialOffer = product.offers.find((o: any) => o.type === 'FREE_TRIAL');
                const newSubOffer = product.offers.find((o: any) => o.type === 'NEW_SUBSCRIPTION');
                
                hasFreeTrial = !!freeTrialOffer;
                const targetOffer = freeTrialOffer || newSubOffer || product.offers[0];
                offerId = targetOffer?.offerId;
                
                if (targetOffer && targetOffer.displayAmount) {
                  const rawAmountStr = targetOffer.displayAmount;
                  const numStr = rawAmountStr.replace(/[^0-9]/g, '');
                  if (numStr) {
                    const rawNum = parseInt(numStr, 10);
                    // [Toss SDK 버그 우회] offer의 displayAmount가 부가세(10%)가 빠진 채로 넘어오는 버그 해결
                    // 만약 토스가 추후에 버그를 수정해서 부가세가 포함된 금액으로 내려온다면?
                    // 현재 공급가는 4450. 부가세 포함 시 4895.
                    // 간단히 10%를 더해줍니다.
                    const withVat = Math.floor(rawNum * 1.1);
                    offerPrice = rawAmountStr.replace(/[0-9,]+/, withVat.toLocaleString());
                  } else {
                    offerPrice = rawAmountStr;
                  }
                }
              }
              setPricing({ originalPrice, offerPrice, hasFreeTrial, offerId, isLoading: false });
            }
          }
        } catch (e) {
          console.error('[IAP] 가격 정보 불러오기 실패:', e);
          setPricing(prev => ({ ...prev, isLoading: false }));
        }
      };
      fetchPricing();
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (isProcessing || pricing.isLoading) return;
    setIsProcessing(true);

    try {
      const orderOptions: any = {
        sku: 'sub.lsn.mq91o1yz.e181446a80',
        processProductGrant: async ({ orderId, subscriptionId }: any) => {
          const res = await apiFetch('/api/users/upgrade', {
            method: 'POST',
            body: JSON.stringify({ orderId, subscriptionId }),
          });
          const data = await res.json();
          return data.success;
        },
      };
      
      if (pricing.offerId) {
        orderOptions.offerId = pricing.offerId;
      }

      const cleanup = IAP.createSubscriptionPurchaseOrder({
        options: orderOptions,
        onEvent: () => {
          setIsProcessing(false);
          setStep('PIN_SETUP');
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

  const handleSetPin = async () => {
    if (pin.length !== 4 || pinConfirm.length !== 4) {
      alert('비밀번호 4자리를 모두 입력해주세요.');
      return;
    }
    if (pin !== pinConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await apiFetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('프리미엄 혜택과 간편 로그인 설정이 완료되었습니다! 🎉');
        onSuccess();
        onClose();
      } else {
        alert(data.error || '비밀번호 설정에 실패했습니다.');
      }
    } catch (err) {
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
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
        {step === 'PAYMENT' ? (
          <>
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
                <span style={{ color: '#3182f6' }}>
                  ({pricing.offerPrice ? `월 ${pricing.offerPrice}` : `월 ${pricing.originalPrice}`})
                </span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                {pricing.hasFreeTrial && (
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
                    🎁 지금 시작하면 무료 체험!
                  </div>
                )}
                
                {pricing.offerPrice && (
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#3182f6', margin: 0 }}>
                    🎉 첫 달 특별 할인 (월 {pricing.originalPrice} → {pricing.offerPrice})
                  </p>
                )}
              </div>

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
                  '세입자 납부일 자동 알림 발송',
                  'PC 웹사이트 전용 대시보드 접근',
                  '간편한 수익/지출 통계 분석',
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#3182f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: '14px', color: '#4E5968', fontWeight: 600 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  style={{
                    background: '#3182f6',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.7 : 1,
                  }}
                >
                  {isProcessing ? '결제 창 여는 중...' : '프리미엄 2주 무료 체험 시작'}
                </button>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  style={{
                    background: 'transparent',
                    color: '#8b95a1',
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  나중에 하기
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#191F28', margin: '0 0 12px 0' }}>
              웹사이트 간편 로그인 설정
            </h2>
            <p style={{ fontSize: '14px', color: '#8b95a1', marginBottom: '24px', lineHeight: 1.5 }}>
              PC 웹사이트에서 로그인할 때 사용할<br />
              <b>숫자 4자리 비밀번호</b>를 설정해주세요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="비밀번호 4자리"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e5e8eb',
                  background: '#f9fafb',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '10px',
                }}
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="비밀번호 4자리 확인"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e5e8eb',
                  background: '#f9fafb',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '10px',
                }}
              />
            </div>

              <button
                onClick={handleSetPin}
                disabled={isProcessing || pin.length !== 4 || pinConfirm.length !== 4}
                style={{
                  width: '100%',
                  background: '#3182f6',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '16px',
                  padding: '16px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (isProcessing || pin.length !== 4 || pinConfirm.length !== 4) ? 0.7 : 1,
                }}
              >
                {isProcessing ? '설정 중...' : '간편 로그인 설정 완료'}
              </button>
            </div>
          )}
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
