"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = Login;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../context/AuthContext");
const tds_1 = require("../components/tds");
const env_1 = require("../utils/env");
/** 전화번호 자동 하이픈 포매터 */
function formatPhone(value) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length <= 3)
        return digits;
    if (digits.length <= 7)
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
function Login() {
    const { login, isLoggedIn, user } = (0, AuthContext_1.useAuth)();
    // 이미 로그인 상태면 즉시 홈으로 리다이렉트
    if (isLoggedIn) {
        const dest = (user === null || user === void 0 ? void 0 : user.role) === 'TENANT' ? '/payment' : '/dashboard';
        return <react_router_dom_1.Navigate to={dest} replace/>;
    }
    const [step, setStep] = (0, react_1.useState)('role');
    const [error, setError] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    // Landlord fields
    const [username, setUsername] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    // Tenant fields
    const [phone, setPhone] = (0, react_1.useState)('');
    const inToss = (0, env_1.isTossApp)();
    const handleLandlordLogin = () => __awaiter(this, void 0, void 0, function* () {
        if (!username || !password) {
            setError('아이디와 비밀번호를 입력하세요');
            return;
        }
        setLoading(true);
        setError('');
        const result = yield login({ role: 'LANDLORD', username, password });
        if (!result.success)
            setError(result.error || '로그인 실패');
        setLoading(false);
    });
    const handleTenantLogin = () => __awaiter(this, void 0, void 0, function* () {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            setError('휴대폰 번호를 입력하세요');
            return;
        }
        setLoading(true);
        setError('');
        const result = yield login({ role: 'TENANT', phone: cleanPhone });
        if (!result.success)
            setError(result.error || '로그인 실패');
        setLoading(false);
    });
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* ─── 역할 선택 ─── */}
        {step === 'role' && (<div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏠</div>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#191f28', margin: 0 }}>체크인사장님</h1>
              <p style={{ fontSize: '14px', color: '#8b95a1', marginTop: '8px' }}>스마트 숙소 관리 솔루션</p>
            </div>

            {inToss && (<div style={{ background: '#e8f3ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>💙</span>
                <span style={{ fontSize: '14px', color: '#1b64da', fontWeight: '600' }}>토스 앱에서 접속 중이에요</span>
              </div>)}

            <p style={{ textAlign: 'center', fontWeight: '600', fontSize: '15px', color: '#333d4b', marginBottom: '20px' }}>
              어떤 역할로 시작하시겠어요?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button onClick={() => { setStep('landlord-login'); setError(''); }} style={{
                padding: '20px 24px', fontSize: '16px', fontWeight: '700', borderRadius: '16px',
                border: 'none', background: '#3182f6', color: 'white',
                display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                transition: 'opacity 0.2s',
            }}>
                <span style={{ fontSize: '32px' }}>🏢</span>
                <div style={{ textAlign: 'left' }}>
                  <div>임대인으로 시작하기</div>
                  <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.85, marginTop: '2px' }}>숙소 관리 · 세입자 관리 · 수입/지출</div>
                </div>
              </button>

              <button onClick={() => { setStep('tenant-login'); setError(''); }} style={{
                padding: '20px 24px', fontSize: '16px', fontWeight: '700', borderRadius: '16px',
                border: 'none', background: '#03b26c', color: 'white',
                display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                transition: 'opacity 0.2s',
            }}>
                <span style={{ fontSize: '32px' }}>🏠</span>
                <div style={{ textAlign: 'left' }}>
                  <div>임차인으로 시작하기</div>
                  <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.85, marginTop: '2px' }}>공지사항 · 수리 문의 · 납부 확인</div>
                </div>
              </button>
            </div>
          </div>)}

        {/* ─── 임대인 로그인 ─── */}
        {step === 'landlord-login' && (<div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>🏢</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>임대인 로그인</h2>
              <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '6px' }}>아이디와 비밀번호를 입력하세요</p>
            </div>

            {error && (<div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939', fontWeight: '500' }}>
                {error}
              </div>)}

            <tds_1.TextField label="아이디" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디를 입력하세요" autoComplete="username"/>

            <tds_1.TextField label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && handleLandlordLogin()}/>

            <div style={{ marginTop: '8px' }}>
              <tds_1.Button variant="primary" onClick={handleLandlordLogin} disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </tds_1.Button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={() => { setStep('role'); setError(''); }} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer' }}>
                ← 다른 역할로 시작하기
              </button>
            </div>
          </div>)}

        {/* ─── 임차인 로그인 ─── */}
        {step === 'tenant-login' && (<div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>🏠</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>임차인 로그인</h2>
              <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '6px' }}>가입 시 입력했던 전화번호를 입력하세요</p>
            </div>

            {error && (<div style={{ background: '#ffeeee', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#e42939', fontWeight: '500' }}>
                {error}
              </div>)}

            <tds_1.TextField label="휴대폰 번호" type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13} autoComplete="tel" onKeyDown={(e) => e.key === 'Enter' && handleTenantLogin()}/>

            <div style={{ marginTop: '8px' }}>
              <tds_1.Button variant="primary" onClick={handleTenantLogin} disabled={loading} style={{ background: '#03b26c' }}>
                {loading ? '로그인 중...' : '로그인'}
              </tds_1.Button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={() => { setStep('role'); setError(''); }} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#8b95a1', cursor: 'pointer' }}>
                ← 다른 역할로 시작하기
              </button>
            </div>
          </div>)}
      </div>
    </div>);
}
