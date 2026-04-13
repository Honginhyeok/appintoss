import { BottomSheet, Button } from './tds';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  
  const handleSubscribe = () => {
    // TODO: 결제 연동 (토스페이먼츠 등) 예약
    alert('구독 결제 플로우(PG 연동)가 준비 중입니다. 월 9,900원');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="프리미엄 요금제 업그레이드">
      <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#191f28', marginBottom: '8px' }}>
          더 많은 방을 관리해 보세요!
        </h3>
        <p style={{ fontSize: '14px', color: '#4e5968', lineHeight: '1.5' }}>
          무료 요금제에서는 방을 최대 3개까지만 등록할 수 있어요.<br/>
          방을 4개 이상 관리하시려면<br/>
          <strong>프리미엄 요금제(월 9,900원)</strong>가 필요해요.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button variant="primary" onClick={handleSubscribe}>
          프리미엄 구독하기
        </Button>
        <Button variant="secondary" onClick={onClose} style={{ background: 'transparent' }}>
          나중에 하기
        </Button>
      </div>
    </BottomSheet>
  );
}
