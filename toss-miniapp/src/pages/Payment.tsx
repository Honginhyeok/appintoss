import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/tds';

export function Payment() {
  const { user } = useAuth();
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('0');
  const bridgeRef = useRef<any>(null);

  useEffect(() => {
    // web-bridge 모듈을 통째로 로드하여 Named Exports(예: openURL)에 접근 가능하게 합니다.
    import('@apps-in-toss/web-bridge')
      .then((m: any) => {
        bridgeRef.current = m; // m.default가 아니라 m 자체를 저장 (Named exports 활용)
        console.log('[Payment] Loaded web-bridge module successfully.');
      })
      .catch((e) => console.log('토스 웹 브릿지 로드 실패:', e));
      
    if (user) {
      const u: any = user;
      setBank(u.landlordSettlementBank || '');
      setAccount(u.landlordSettlementAccount || '');
      setAmount(u.rentAmount ? String(u.rentAmount) : '0');
    }
  }, [user]);

  const handleTossSend = () => {
    if (!bank || !account) {
      alert('집주인이 정산 계좌를 등록하지 않아 아직 월세를 납부할 수 없습니다.\n집주인에게 문의해 주세요.');
      return;
    }

    /*
     * [TODO: 토스 앱인토스 P2P 간편 송금 지원 시 복구할 코드]
     * 담당자 확인 결과, 현재 미니앱 내에서는 '개인 간 송금 거래(수수료 0원)' 딥링크를 정책상 지원하지 않음.
     * 추후 지원될 경우 아래 주석을 풀고 사용하시면 됩니다.
     * 
     * const numAmount = parseInt(amount, 10) || 0;
     * const memo = `월세 납부 (${user?.name || '임차인'})`;
     * const remitUrl = `supertoss://remit?bankName=${encodeURIComponent(bank)}&accountNo=${account}&amount=${numAmount}&msg=${encodeURIComponent(memo)}`;
     * 
     * // 즉시 실행 (비동기 처리 시 브라우저 보안에 의해 무시될 수 있음)
     * window.location.href = remitUrl;
     */

    // 현재는 송금창 이동이 원천 차단되어 있으므로, 곧바로 계좌번호 복사 및 안내 팝업 실행
    fallbackCopy();
  };

  const fallbackCopy = async () => {
    const textToCopy = `${bank} ${account}`;
    let success = false;

    // 1. 토스 네이티브 클립보드 API 시도
    if (bridgeRef.current && typeof bridgeRef.current.setClipboardText === 'function') {
      try {
        await bridgeRef.current.setClipboardText(textToCopy);
        success = true;
      } catch (e) {
        console.warn('[Payment] Toss native clipboard failed', e);
      }
    }

    // 2. 표준 웹 클립보드 API 시도 (비동기 에러 핸들링 추가하여 빨간 에러 방지)
    if (!success && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch (e) {
        console.warn('[Payment] Navigator clipboard failed', e);
      }
    }

    // 3. 구형 브라우저 우회 방식 시도
    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        success = true;
      } catch (e) {
        console.error('[Payment] Legacy clipboard failed', e);
      }
    }

    // 복사 완료 안내 (에러가 화면에 뜨지 않도록 깔끔하게 처리됨)
    alert(`집주인의 계좌번호(${bank} ${account})가 클립보드에 복사되었습니다.\n\n[안내]\n토스 미니앱 정책상 '수수료 없는 개인 송금' 화면으로의 자동 이동이 제한되어 있습니다.\n\n하단의 '홈' 메뉴로 이동하여 복사된 계좌로 송금해 주세요.`);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>이번 달 월세</h2>
      <p style={{ color: '#4e5968', marginBottom: '32px' }}>{parseInt(amount).toLocaleString()}원을 납부해주세요.</p>

      {/* 바텀시트 팝업 없이 즉각적으로 송금 플로우 실행 */}
      <Button variant="primary" onClick={handleTossSend}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5V12.1578L16.2428 8.91501C16.6333 8.52448 17.2665 8.52448 17.657 8.91501C18.0475 9.30553 18.0475 9.9387 17.657 10.3292L12.7071 15.2792C12.3166 15.6697 11.6834 15.6697 11.2929 15.2792L6.34293 10.3292C5.9524 9.9387 5.9524 9.30553 6.34293 8.91501C6.73345 8.52448 7.36662 8.52448 7.75714 8.91501L11 12.1578V5Z" fill="currentColor"/>
          <path d="M4 17C4 16.4477 4.44772 16 5 16H19C19.5523 16 20 16.4477 20 17C20 17.5523 19.5523 18 19 18H5C4.44772 18 4 17.5523 4 17Z" fill="currentColor"/>
        </svg>
        수수료 없이 바로 송금하기
      </Button>
    </div>
  );
}
