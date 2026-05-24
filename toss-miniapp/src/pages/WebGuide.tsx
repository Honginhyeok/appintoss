import { useNavigate } from 'react-router-dom';

export function WebGuide() {
  const navigate = useNavigate();

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://www.checkin-host.com');
    alert('클립보드에 주소가 복사되었습니다!\nPC나 스마트폰 브라우저에 붙여넣기 해주세요.');
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f9fafb' }}>
      <button 
        onClick={() => navigate('/dashboard')} 
        style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer', marginBottom: '16px' }}
      >
        ← 홈으로 돌아가기
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#191f28', marginBottom: '8px' }}>
        💻 PC 웹 버전 안내
      </h2>
      <p style={{ fontSize: '14px', color: '#4e5968', lineHeight: 1.5, marginBottom: '24px' }}>
        체크인 사장님은 모바일 앱뿐만 아니라, 더 넓은 화면에서 편리하게 관리할 수 있는 PC 웹 버전을 제공합니다.
      </p>

      {/* 리포트 캡쳐본(가상) 영역 */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        padding: '24px', 
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#191f28', marginBottom: '8px' }}>
          전문적인 임대 관리 리포트
        </h3>
        <p style={{ fontSize: '13px', color: '#8b95a1', lineHeight: 1.5 }}>
          한눈에 들어오는 대시보드와 상세 내역 필터링 등<br />
          웹 버전에 최적화된 전문 기능을 경험해보세요.
        </p>
        
        {/* 추후 실제 스크린샷 이미지로 대체 가능 */}
        <div style={{
          marginTop: '20px',
          height: '160px',
          background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          (웹 버전 스크린샷 이미지 삽입 영역)
        </div>
      </div>

      <div style={{ 
        background: '#EBF4FF', 
        padding: '20px', 
        borderRadius: '16px', 
        marginBottom: '32px' 
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#3182f6', marginBottom: '8px' }}>
          접속 주소
        </div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#191f28', marginBottom: '16px', letterSpacing: '0.5px' }}>
          www.checkin-host.com
        </div>
        <button
          onClick={handleCopyLink}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: '#3182f6',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(49,130,246,0.3)',
          }}
        >
          🔗 주소 복사하기
        </button>
      </div>
      
      <div style={{ fontSize: '12px', color: '#8b95a1', textAlign: 'center', lineHeight: 1.5 }}>
        ※ PC 웹 버전은 프리미엄 구독 시<br />
        모든 기능을 제한 없이 이용하실 수 있습니다.
      </div>
    </div>
  );
}
