import { useEffect, useState } from 'react';

interface PaymentBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTossTransfer: () => void;
  onSelectTossPay: () => void;
  onSelectManualDeposit: () => void;
}

export function PaymentBottomSheet({ 
  isOpen, 
  onClose, 
  onSelectTossTransfer, 
  onSelectTossPay, 
  onSelectManualDeposit 
}: PaymentBottomSheetProps) {
  
  // Tailwind 기반 부드러운 애니메이션 제어용 상태
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col justify-end transition-colors duration-300 ${show ? 'bg-black/40' : 'bg-transparent'}`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-t-3xl w-full max-w-[480px] mx-auto overflow-hidden transition-transform duration-300 ease-out transform ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* 헤더 */}
        <div className="px-6 pt-2 pb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">어떤 방식으로 납부할까요?</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 리스트 아이템 */}
        <div className="px-4 pb-8 flex flex-col gap-1">
          
          {/* 옵션 1: 토스 간편 송금 */}
          <div 
            onClick={onSelectTossTransfer}
            className="flex items-center justify-between p-4 rounded-2xl active:bg-blue-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                💸
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
                  토스로 바로 송금하기
                </span>
                <span className="text-[13px] text-gray-500 mt-1">수수료 0원, 계좌번호 입력 없이 1초 만에</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[11px] font-bold rounded-lg shrink-0">추천</span>
            </div>
          </div>

          <hr className="border-gray-100 border-t mx-4 my-1" />

          {/* 옵션 2: 직접 입금 */}
          <div 
            onClick={onSelectManualDeposit}
            className="flex items-center justify-between p-4 rounded-2xl active:bg-gray-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🏦
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-bold text-gray-900">직접 입금하고 알려주기</span>
                <span className="text-[13px] text-gray-500 mt-1">다른 은행 앱을 쓰거나 직접 보냈을 때</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 border-t mx-4 my-1" />

          {/* 옵션 3: 카드/간편결제 (Disable) */}
          <div 
            onClick={onSelectTossPay}
            className="flex items-center justify-between p-4 rounded-2xl opacity-50 cursor-not-allowed pointer-events-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl shrink-0">
                💳
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-bold text-gray-900">카드/간편결제</span>
                <span className="text-[13px] text-gray-500 mt-1">신용카드나 페이로 결제 (점검 중)</span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="px-2 py-1 bg-gray-200 text-gray-500 text-[11px] font-bold rounded-lg shrink-0">준비 중</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
