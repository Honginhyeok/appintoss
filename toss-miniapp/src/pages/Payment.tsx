import { useState, useEffect } from 'react';
import { Button } from '../components/tds';
import { PaymentBottomSheet } from '../components/PaymentBottomSheet';

export function Payment() {
  const [bank, setBank] = useState('국민');
  const [account, setAccount] = useState('11111111111');
  const [amount, setAmount] = useState('500000');
  const [isSheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // 실제로는 /api/auth/me 를 fetch 하여 세팅합니다.
    setBank('토스');
    setAccount('10001000100');
    setAmount('450000');
  }, []);

  const handleTossSend = () => {
    setSheetOpen(false);
    const tossUrl = `supertoss://send?bank=${encodeURIComponent(bank)}&account=${encodeURIComponent(account)}&amount=${amount}`;
    window.location.href = tossUrl;
  };

  const handleTossPayments = () => {
    setSheetOpen(false);
    // TODO: 토스페이먼츠(PG) 결제 위젯 호출 플로우 연동
    alert('토스페이먼츠 연동이 예약된 기능입니다.');
  };

  const handleManualDeposit = () => {
    setSheetOpen(false);
    alert(`[계좌 안내]\n${bank} ${account}\n로 직접 송금 후 입금 확인 버튼을 눌러주세요.`);
    // 백엔드로 알림 쏘는 로직 호출
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>이번 달 월세</h2>
      <p style={{ color: '#4e5968', marginBottom: '32px' }}>{parseInt(amount).toLocaleString()}원을 납부해주세요.</p>

      {/* 결제 수단 팝업을 여는 메인 버튼 */}
      <Button variant="primary" onClick={() => setSheetOpen(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5V12.1578L16.2428 8.91501C16.6333 8.52448 17.2665 8.52448 17.657 8.91501C18.0475 9.30553 18.0475 9.9387 17.657 10.3292L12.7071 15.2792C12.3166 15.6697 11.6834 15.6697 11.2929 15.2792L6.34293 10.3292C5.9524 9.9387 5.9524 9.30553 6.34293 8.91501C6.73345 8.52448 7.36662 8.52448 7.75714 8.91501L11 12.1578V5Z" fill="currentColor"/>
          <path d="M4 17C4 16.4477 4.44772 16 5 16H19C19.5523 16 20 16.4477 20 17C20 17.5523 19.5523 18 19 18H5C4.44772 18 4 17.5523 4 17Z" fill="currentColor"/>
        </svg>
        월세 납부하기
      </Button>
      
      <PaymentBottomSheet 
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelectTossTransfer={handleTossSend}
        onSelectTossPay={handleTossPayments}
        onSelectManualDeposit={handleManualDeposit}
      />
    </div>
  );
}
