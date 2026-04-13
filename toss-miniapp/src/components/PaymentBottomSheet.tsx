import { BottomSheet, ListRow } from './tds';

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
  
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="어떤 방식으로 납부할까요?">
      <div style={{ marginTop: '8px' }}>
        <ListRow 
          icon={<span style={{ fontSize: '20px' }}>💸</span>}
          title="토스 간편 송금 (수수료 무료)" 
          subTitle="수수료 없이 사장님 계좌로 바로 송금해요" 
          onClick={onSelectTossTransfer} 
        />
        
        <ListRow 
          icon={<span style={{ fontSize: '20px' }}>💳</span>}
          title="토스 간편 결제 (카드/토스페이)" 
          subTitle="카드나 토스페이로 간편하게 결제해요" 
          onClick={onSelectTossPay} 
        />

        <ListRow 
          icon={<span style={{ fontSize: '20px' }}>🏦</span>}
          title="직접 입금하고 확인 요청하기" 
          subTitle="다른 은행 앱에서 직접 송금한 뒤 사장님께 알려요" 
          onClick={onSelectManualDeposit} 
        />
      </div>
    </BottomSheet>
  );
}
