import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, TextField } from '../components/tds';
import { isTossApp, apiFetch, setToken } from '../utils/env';
// appLogin은 동적 import로 호출 시점에 불러옴 (Ait 전역 객체 주입 전 정적 import하면 ReferenceError 발생)

/** 전화번호 자동 하이픈 포매터 */
function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

type Step = 'role' | 'landlord-login' | 'tenant-login' | 'toss-register';
type SelectedRole = 'TENANT' | 'LANDLORD' | null;

export function Login() {
  const { login, isLoggedIn, user, refreshUser } = useAuth();

  // 이미 로그인 상태면 즉시 홈으로 리다이렉트
  if (isLoggedIn) {
    const dest = user?.role === 'TENANT' ? '/payment' : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  const [step, setStep] = useState<Step>('role');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [_selectedRole, setSelectedRole] = useState<SelectedRole>(null);

  // 토스 최초 가입 시 필요한 상태
  const [tempToken, setTempToken] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');

  // Landlord fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Tenant fields
  const [phone, setPhone] = useState('');

  const inToss = isTossApp();

  const handleLandlordLogin = async () => {
    if (!username || !password) { setError('아이디와 비밀번호를 입력하세요'); return; }
    setLoading(true);
    setError('');
    const result = await login({ role: 'LANDLORD', username, password, inToss });
    if (!result.success) setError(result.error || '로그인 실패');
    setLoading(false);
  };

  const handleTenantLogin = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) { setError('휴대폰 번호를 입력하세요'); return; }
    setLoading(true);
    setError('');
    const result = await login({ role: 'TENANT', phone: cleanPhone, inToss });
    if (!result.success) setError(result.error || '로그인 실패');
    setLoading(false);
  };

  /** 토스 간편 로그인 (Native App 전용) */
  const handleTossLoginNative = async (role: SelectedRole) => {
    if (!role) return;
    try {
      setLoading(true);

      console.log(`[Toss SDK] appLogin 호출 시도 중... (파라미터 없음)`);

      // 공식 SDK 동적 임포트 (Ait 주입 후 호출해야 하므로 동적 로드 유지)
      const { appLogin } = await import('@apps-in-toss/web-framework');

      const result: any = await appLogin();
      console.log("[Toss SDK] 토스 로그인 응답 획득:", result);

      // authorizationCode 및 referrer 추출
      const code = result?.authorizationCode || result?.code || (typeof result === 'string' ? result : '');
      const referrer = result?.referrer || '';

      if (!code) {
        throw new Error('토스 앱으로부터 인증 코드를 받지 못했습니다.');
      }

      const response = await apiFetch('/api/auth/toss/login', {
        method: 'POST',
        body: JSON.stringify({ authorizationCode: code, referrer, selectedRole: role })
      });

      const data = await response.json();

      // 신규 유저 → 추가 정보 입력 필요
      if (data.needsRegistration) {
        setTempToken(data.tempToken);
        setSelectedRole(role);
        setStep('toss-register');
        setLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || '토스 로그인 처리 중 오류가 발생했습니다.');
      }

      if (data.token) {
        setToken(data.token);
      }

      await refreshUser();

    } catch (error: any) {
      console.error("[Toss SDK] Toss Login SDK Error (Basic):", error);
      console.error("[Toss SDK] Error Message:", error?.message);
      console.error("[Toss SDK] Error Code:", error?.code);
      console.error("[Toss SDK] Error Stack:", error?.stack);

      // 빈 객체({})로 뜨는 브릿지 에러 심층 분석
      try {
        console.error("[Toss SDK] Deep Error Dump:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error("[Toss SDK] Failed to stringify error");
      }

      // 절대 화면(UI)에 에러 문구를 렌더링하지 마!
      setLoading(false);
    }
  };

  /** 토스 최초 가입 — 추가 정보 입력 후 가입 완료 */
  const handleTossRegister = async () => {
    try {
      setLoading(true);
      setError('');

      const body: any = { tempToken, selectedRole: _selectedRole };
      if (_selectedRole === 'TENANT') {
        if (!inviteCode.trim()) { setError('초대코드를 입력하세요'); setLoading(false); return; }
        body.inviteCode = inviteCode.trim();
      } else {
        const cleanPhone = landlordPhone.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 10) { setError('유효한 전화번호를 입력하세요'); setLoading(false); return; }
        body.phone = cleanPhone;
      }

      const response = await apiFetch('/api/auth/toss/complete-registration', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '가입 처리 중 오류가 발생했습니다.');
      }

      if (data.token) setToken(data.token);
      await refreshUser();
    } catch (error: any) {
      setError(error?.message || '가입 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  /** 토스 간편 로그인 (Web 전용 OAuth 리다이렉트) */
  const handleTossLoginWeb = (role: SelectedRole) => {
    if (!role) return;
    const clientId = 'dy93zgk83vqxl4cas2vqql7xx6q6f9zb';
    const redirectUri = encodeURIComponent('https://checkin-host.com/api/toss/callback');
    const tossOAuthUrl = `https://toss.im/toss-sign/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${role}`;
    window.location.href = tossOAuthUrl;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* ─── 역할 선택 (1안: 역할 먼저 선택 → 토스 로그인) ─── */}
        {step === 'role' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏠</div>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#191f28', margin: 0 }}>체크인사장님</h1>
              <p style={{ fontSize: '14px', color: '#8b95a1', marginTop: '8px' }}>스마트 숙소 관리 솔루션</p>
            </div>

            {inToss && (
              <div style={{ background: '#e8f3ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>💙</span>
                <span style={{ fontSize: '14px', color: '#1b64da', fontWeight: '600' }}>토스 앱에서 접속 중이에요</span>
              </div>
            )}

            {error && (
              <div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939', fontWeight: '500' }}>
                {error}
              </div>
            )}

            <p style={{ textAlign: 'center', fontWeight: '600', fontSize: '15px', color: '#333d4b', marginBottom: '20px' }}>
              어떤 역할로 시작하시겠어요?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 🏠 임차인으로 시작하기 */}
              <button
                onClick={() => {
                  setSelectedRole('TENANT');
                  if (inToss) {
                    handleTossLoginNative('TENANT');
                  } else {
                    setStep('tenant-login');
                    setError('');
                  }
                }}
                disabled={loading}
                style={{
                  padding: '20px 24px', fontSize: '16px', fontWeight: '700', borderRadius: '16px',
                  border: 'none', background: '#03b26c', color: 'white',
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                  transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: '32px' }}>🏠</span>
                <div style={{ textAlign: 'left' }}>
                  <div>임차인(세입자)으로 시작하기</div>
                  <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.85, marginTop: '2px' }}>
                    {inToss ? '토스 간편 로그인으로 1초 만에' : '공지사항 · 수리 문의 · 납부 확인'}
                  </div>
                </div>
              </button>

              {/* 👑 임대인으로 시작하기 */}
              <button
                onClick={() => {
                  setSelectedRole('LANDLORD');
                  if (inToss) {
                    handleTossLoginNative('LANDLORD');
                  } else {
                    setStep('landlord-login');
                    setError('');
                  }
                }}
                disabled={loading}
                style={{
                  padding: '20px 24px', fontSize: '16px', fontWeight: '700', borderRadius: '16px',
                  border: 'none', background: '#3182f6', color: 'white',
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                  transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: '32px' }}>👑</span>
                <div style={{ textAlign: 'left' }}>
                  <div>임대인(집주인)으로 시작하기</div>
                  <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.85, marginTop: '2px' }}>
                    {inToss ? '토스 간편 로그인으로 1초 만에' : '숙소 관리 · 세입자 관리 · 수입/지출'}
                  </div>
                </div>
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #f2f4f6', borderTopColor: '#3182f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                <span style={{ color: '#8b95a1', fontSize: '13px' }}>토스 로그인 처리 중...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        )}

        {/* ─── 임대인 로그인 (비-토스 환경 폴백) ─── */}
        {step === 'landlord-login' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>👑</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>임대인 로그인</h2>
              <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '6px' }}>아이디와 비밀번호를 입력하세요</p>
            </div>

            {error && (
              <div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939', fontWeight: '500' }}>
                {error}
              </div>
            )}

            <TextField
              label="아이디"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
            />

            <TextField
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && handleLandlordLogin()}
            />

            <div style={{ marginTop: '8px' }}>
              <Button variant="primary" onClick={handleLandlordLogin} disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </div>

            {/* 웹 전용 토스 로그인 버튼 추가 */}
            {!inToss && (
              <div style={{ marginTop: '16px' }}>
                <Button
                  variant="secondary"
                  onClick={() => handleTossLoginWeb('LANDLORD')}
                  disabled={loading}
                  style={{ background: '#3182f6', color: '#fff', border: 'none' }}
                >
                  <span style={{ marginRight: '8px' }}>💙</span>
                  토스 간편 로그인
                </Button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => { setStep('role'); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer' }}
              >
                ← 다른 역할로 시작하기
              </button>
            </div>
          </div>
        )}

        {/* ─── 임차인 로그인 (비-토스 환경 폴백) ─── */}
        {step === 'tenant-login' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>🏠</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>임차인 로그인</h2>
              <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '6px' }}>가입 시 입력했던 전화번호를 입력하세요</p>
            </div>

            {error && (
              <div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939', fontWeight: '500' }}>
                {error}
              </div>
            )}

            <TextField
              label="휴대폰 번호"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              maxLength={13}
              autoComplete="tel"
              onKeyDown={(e) => e.key === 'Enter' && handleTenantLogin()}
            />

            <div style={{ marginTop: '8px' }}>
              <Button variant="primary" onClick={handleTenantLogin} disabled={loading} style={{ background: '#03b26c' }}>
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </div>

            {/* 웹 전용 토스 로그인 버튼 추가 */}
            {!inToss && (
              <div style={{ marginTop: '16px' }}>
                <Button
                  variant="secondary"
                  onClick={() => handleTossLoginWeb('TENANT')}
                  disabled={loading}
                  style={{ background: '#3182f6', color: '#fff', border: 'none' }}
                >
                  <span style={{ marginRight: '8px' }}>💙</span>
                  토스 간편 로그인
                </Button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => { setStep('role'); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer' }}
              >
                ← 다른 역할로 시작하기
              </button>
            </div>
          </div>
        )}

        {/* ─── 토스 최초 가입 — 추가 정보 입력 ─── */}
        {step === 'toss-register' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{_selectedRole === 'TENANT' ? '🏠' : '👑'}</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#191f28', margin: '0 0 8px' }}>
                {_selectedRole === 'TENANT' ? '임차인(세입자) 가입' : '임대인(집주인) 가입'}
              </h2>
              <p style={{ fontSize: '14px', color: '#8b95a1', margin: 0 }}>
                {_selectedRole === 'TENANT' ? '임대인에게 받은 초대코드를 입력해 주세요' : '전화번호를 입력해 주세요'}
              </p>
            </div>

            {error && (
              <div style={{ background: '#fff0f0', color: '#e53e3e', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {_selectedRole === 'TENANT' ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>초대코드</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="임대인에게 받은 초대코드 입력"
                  style={{
                    width: '100%', padding: '14px 16px', fontSize: '16px', borderRadius: '12px',
                    border: '1.5px solid #e5e8eb', background: '#f9fafb', color: '#191f28', boxSizing: 'border-box',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3182f6'}
                  onBlur={e => e.target.style.borderColor = '#e5e8eb'}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>전화번호</label>
                <input
                  type="tel"
                  value={landlordPhone}
                  onChange={e => setLandlordPhone(formatPhone(e.target.value))}
                  placeholder="010-0000-0000"
                  style={{
                    width: '100%', padding: '14px 16px', fontSize: '16px', borderRadius: '12px',
                    border: '1.5px solid #e5e8eb', background: '#f9fafb', color: '#191f28', boxSizing: 'border-box',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3182f6'}
                  onBlur={e => e.target.style.borderColor = '#e5e8eb'}
                />
              </div>
            )}

            <button
              onClick={handleTossRegister}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: '700',
                borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: loading ? '#d1d5db' : '#3182f6', color: '#fff',
                transition: 'background 0.2s'
              }}
            >
              {loading ? '처리 중...' : '가입 완료'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => { setStep('role'); setError(''); setTempToken(''); }}
                style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer' }}
              >
                ← 처음으로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
