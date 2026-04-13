import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, ListRow, TextField } from '../components/tds';
import { apiFetch } from '../utils/env';

export function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const [view, setView] = useState<'menu' | 'account' | 'password'>('menu');

  // 정산 계좌
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (user) {
      setBank(user.settlementBank || '');
      setAccount(user.settlementAccount || '');
      setName(user.settlementName || '');
    }
  }, [user]);

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/auth/settlement', {
        method: 'PUT',
        body: JSON.stringify({ settlementBank: bank, settlementAccount: account, settlementName: name }),
      });
      if (res.ok) {
        alert('정산 계좌가 저장되었습니다.');
        await refreshUser();
        setView('menu');
      } else {
        const data = await res.json();
        alert(data.error || '저장 실패');
      }
    } catch {
      alert('네트워크 오류');
    }
    setSaving(false);
  };

  const handleChangePw = async () => {
    setPwMsg('');
    if (!currentPw || !newPw) { setPwMsg('비밀번호를 모두 입력하세요'); return; }
    if (newPw.length < 4) { setPwMsg('새 비밀번호는 4자 이상이어야 합니다'); return; }
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('비밀번호가 변경되었습니다.');
        setCurrentPw(''); setNewPw('');
        setView('menu');
      } else {
        setPwMsg(data.error || '변경 실패');
      }
    } catch {
      setPwMsg('네트워크 오류');
    }
  };

  const handleLogout = async () => {
    if (confirm('정말 로그아웃 하시겠어요?')) {
      await logout();
    }
  };

  // 메뉴 화면
  if (view === 'menu') {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: '#ffffff' }}>
        {/* 프로필 카드 */}
        <div style={{ background: '#f2f4f6', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#3182f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff' }}>
              {user?.role === 'TENANT' ? '🏠' : '🏢'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#191f28' }}>{user?.name || user?.username || '사용자'}</div>
              <div style={{ fontSize: '13px', color: '#8b95a1', marginTop: '2px' }}>
                {user?.role === 'ADMIN' ? '관리자' : user?.role === 'TENANT' ? '임차인' : '임대인'} · {user?.username}
              </div>
            </div>
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <div style={{ borderTop: '1px solid #f2f4f6' }}>
          {user?.role !== 'TENANT' && (
            <ListRow
              icon={<span>🏦</span>}
              title="정산 계좌 관리"
              subTitle={bank && account ? `${bank} ${account}` : '계좌를 등록해 주세요'}
              onClick={() => setView('account')}
            />
          )}
          {user?.role !== 'TENANT' && (
            <ListRow
              icon={<span>🔒</span>}
              title="비밀번호 변경"
              subTitle="보안을 위해 주기적으로 변경하세요"
              onClick={() => setView('password')}
            />
          )}
          <div style={{ marginTop: '32px' }}>
            <Button variant="danger" onClick={handleLogout}>
              🚪 로그아웃
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 정산 계좌 관리 화면
  if (view === 'account') {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: '#ffffff' }}>
        <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer', marginBottom: '16px' }}>
          ← 설정으로 돌아가기
        </button>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#191f28' }}>정산 계좌 관리</h2>
        <p style={{ color: '#8b95a1', fontSize: '14px', marginBottom: '32px' }}>임차인의 토스 송금을 받을 계좌입니다.</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>은행명</label>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">은행 선택</option>
            <option value="KB국민">KB국민은행</option>
            <option value="신한">신한은행</option>
            <option value="토스뱅크">토스뱅크</option>
            <option value="우리">우리은행</option>
            <option value="하나">하나은행</option>
            <option value="기업">IBK기업은행</option>
            <option value="농협">NH농협</option>
            <option value="카카오뱅크">카카오뱅크</option>
          </select>
        </div>

        <TextField
          label="계좌번호"
          type="text"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="숫자만 입력"
        />

        <TextField
          label="예금주"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />

        <Button variant="primary" onClick={handleSaveAccount} disabled={saving}>
          {saving ? '저장 중...' : '계좌 저장하기'}
        </Button>
      </div>
    );
  }

  // 비밀번호 변경 화면
  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#ffffff' }}>
      <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer', marginBottom: '16px' }}>
        ← 설정으로 돌아가기
      </button>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#191f28' }}>비밀번호 변경</h2>
      <p style={{ color: '#8b95a1', fontSize: '14px', marginBottom: '32px' }}>보안을 위해 주기적으로 변경해 주세요.</p>

      {pwMsg && (
        <div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939' }}>
          {pwMsg}
        </div>
      )}

      <TextField
        label="현재 비밀번호"
        type="password"
        value={currentPw}
        onChange={(e) => setCurrentPw(e.target.value)}
        placeholder="현재 비밀번호"
      />

      <TextField
        label="새 비밀번호"
        type="password"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
        placeholder="4자 이상"
        onKeyDown={(e) => e.key === 'Enter' && handleChangePw()}
      />

      <Button variant="primary" onClick={handleChangePw}>
        비밀번호 변경하기
      </Button>
    </div>
  );
}
