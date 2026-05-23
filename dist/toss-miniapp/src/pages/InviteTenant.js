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
exports.InviteTenant = InviteTenant;
const react_1 = require("react");
const env_1 = require("../utils/env");
const tds_1 = require("../components/tds");
function InviteTenant() {
    const [invitations, setInvitations] = (0, react_1.useState)([]);
    const [tenants, setTenants] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedTenantId, setSelectedTenantId] = (0, react_1.useState)('');
    const [generating, setGenerating] = (0, react_1.useState)(false);
    const [toast, setToast] = (0, react_1.useState)('');
    const load = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const [iRes, tRes] = yield Promise.all([
                (0, env_1.apiFetch)('/api/invitations'),
                (0, env_1.apiFetch)('/api/tenants'),
            ]);
            if (iRes.ok)
                setInvitations(yield iRes.json());
            if (tRes.ok)
                setTenants(yield tRes.json());
        }
        catch ( /* ignore */_a) { /* ignore */ }
        setLoading(false);
    }), []);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };
    const generate = () => __awaiter(this, void 0, void 0, function* () {
        setGenerating(true);
        try {
            const res = yield (0, env_1.apiFetch)('/api/invitations', {
                method: 'POST',
                body: JSON.stringify({ tenantId: selectedTenantId || null }),
            });
            if (res.ok) {
                showToast('새 초대코드가 발급되었습니다! 🎉');
                yield load();
            }
            else {
                const d = yield res.json();
                alert(d.error || '발급 실패');
            }
        }
        catch (_a) {
            alert('네트워크 오류');
        }
        setGenerating(false);
    });
    const deleteInv = (id) => __awaiter(this, void 0, void 0, function* () {
        if (!confirm('이 초대코드를 삭제하시겠습니까?\n연결된 세입자가 퇴실 처리될 수 있습니다.'))
            return;
        try {
            const res = yield (0, env_1.apiFetch)(`/api/invitations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('초대코드가 삭제되었습니다.');
                yield load();
            }
        }
        catch (_a) {
            alert('네트워크 오류');
        }
    });
    const shareCode = (code) => __awaiter(this, void 0, void 0, function* () {
        const text = `[체크인사장님] 초대코드: ${code}\n이 코드로 앱에서 임차인 가입을 해주세요.`;
        if ((0, env_1.isTossApp)() && navigator.share) {
            // 토스 앱 환경: 네이티브 공유
            try {
                yield navigator.share({ title: '체크인사장님 초대코드', text });
            }
            catch ( /* 사용자가 취소 */_a) { /* 사용자가 취소 */ }
        }
        else {
            // 일반 웹 환경: 클립보드 복사
            try {
                yield navigator.clipboard.writeText(text);
                showToast('초대코드가 복사되었습니다. 세입자에게 카톡이나 문자로 전달해 주세요. 📋');
            }
            catch (_b) {
                // fallback
                prompt('아래 코드를 복사해 주세요:', text);
            }
        }
    });
    const statusBadge = (inv) => {
        const expired = new Date(inv.expiresAt) < new Date();
        if (inv.isUsed)
            return { label: '사용됨', bg: '#f2f4f6', color: '#8b95a1' };
        if (expired)
            return { label: '만료됨', bg: '#ffeeee', color: '#f04452' };
        return { label: '대기중', bg: '#f0faf6', color: '#03b26c' };
    };
    const assignedTenant = (inv) => {
        if (!inv.tenantId)
            return null;
        return tenants.find(t => t.id === inv.tenantId);
    };
    return (<div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      {/* Toast */}
      {toast && (<div style={{
                position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
                background: '#333d4b', color: '#fff', padding: '14px 24px', borderRadius: '14px',
                fontSize: '14px', fontWeight: '500', zIndex: 10000,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxWidth: '360px', textAlign: 'center',
                animation: 'slideUp 0.3s ease-out',
            }}>
          {toast}
        </div>)}
      <style>{`@keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); }}`}</style>

      {/* 헤더 */}
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: '0 0 4px' }}>🎫 초대코드 관리</h2>
      <p style={{ fontSize: '13px', color: '#8b95a1', marginBottom: '24px' }}>
        세입자를 앱으로 초대할 수 있는 코드를 발급합니다
      </p>

      {/* 신규 발급 카드 */}
      <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#191f28', marginBottom: '16px' }}>새 초대코드 발급</div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>세입자 지정 (선택)</label>
          <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}>
            <option value="">세입자 지정 안함</option>
            {tenants.map(t => {
            var _a;
            return (<option key={t.id} value={t.id}>{t.name} (방: {((_a = t.room) === null || _a === void 0 ? void 0 : _a.name) || '미정'})</option>);
        })}
          </select>
        </div>

        <tds_1.Button variant="primary" onClick={generate} disabled={generating}>
          {generating ? '발급 중...' : '🎫 초대코드 생성하기'}
        </tds_1.Button>
      </div>

      {/* 초대코드 목록 */}
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#191f28', marginBottom: '12px' }}>
        발급된 초대코드 ({invitations.length})
      </div>

      {loading ? (<div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>) : invitations.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
          <div style={{ fontSize: '14px' }}>발급된 초대코드가 없습니다</div>
        </div>) : (<div>
          {invitations.map(inv => {
                var _a;
                const badge = statusBadge(inv);
                const tenant = assignedTenant(inv);
                const isActive = !inv.isUsed && new Date(inv.expiresAt) >= new Date();
                return (<div key={inv.id} style={{
                        background: '#f9fafb', borderRadius: '16px', padding: '16px', marginBottom: '12px',
                    }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: '700', color: '#191f28', letterSpacing: '2px' }}>
                    {inv.code}
                  </div>
                  <span style={{
                        fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '6px',
                        background: badge.bg, color: badge.color,
                    }}>
                    {badge.label}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#6b7684', marginBottom: '8px' }}>
                  {tenant ? `👤 ${tenant.name} (${((_a = tenant.room) === null || _a === void 0 ? void 0 : _a.name) || '방 미정'})` : '👤 지정 안됨'}
                  {' · '}만료: {new Date(inv.expiresAt).toLocaleDateString('ko-KR')}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isActive && (<tds_1.Button variant="secondary" style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }} onClick={() => shareCode(inv.code)}>
                      📋 {(0, env_1.isTossApp)() ? '공유하기' : '코드 복사'}
                    </tds_1.Button>)}
                  <button onClick={() => deleteInv(inv.id)} style={{
                        padding: '10px 14px', borderRadius: '10px', border: 'none',
                        background: '#ffeeee', color: '#f04452', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer',
                    }}>
                    삭제
                  </button>
                </div>
              </div>);
            })}
        </div>)}
    </div>);
}
