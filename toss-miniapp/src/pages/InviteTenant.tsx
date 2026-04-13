import { useState, useEffect, useCallback } from 'react';
import { apiFetch, isTossApp } from '../utils/env';
import { Button } from '../components/tds';

interface Invitation {
  id: string;
  code: string;
  tenantId?: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
}

interface TenantOption {
  id: string;
  name: string;
  room?: { name: string };
}

export function InviteTenant() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, tRes] = await Promise.all([
        apiFetch('/api/invitations'),
        apiFetch('/api/tenants'),
      ]);
      if (iRes.ok) setInvitations(await iRes.json());
      if (tRes.ok) setTenants(await tRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({ tenantId: selectedTenantId || null }),
      });
      if (res.ok) {
        showToast('새 초대코드가 발급되었습니다! 🎉');
        await load();
      } else {
        const d = await res.json();
        alert(d.error || '발급 실패');
      }
    } catch { alert('네트워크 오류'); }
    setGenerating(false);
  };

  const deleteInv = async (id: string) => {
    if (!confirm('이 초대코드를 삭제하시겠습니까?\n연결된 세입자가 퇴실 처리될 수 있습니다.')) return;
    try {
      const res = await apiFetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('초대코드가 삭제되었습니다.');
        await load();
      }
    } catch { alert('네트워크 오류'); }
  };

  const shareCode = async (code: string) => {
    const text = `[체크인사장님] 초대코드: ${code}\n이 코드로 앱에서 임차인 가입을 해주세요.`;

    if (isTossApp() && navigator.share) {
      // 토스 앱 환경: 네이티브 공유
      try {
        await navigator.share({ title: '체크인사장님 초대코드', text });
      } catch { /* 사용자가 취소 */ }
    } else {
      // 일반 웹 환경: 클립보드 복사
      try {
        await navigator.clipboard.writeText(text);
        showToast('초대코드가 복사되었습니다. 세입자에게 카톡이나 문자로 전달해 주세요. 📋');
      } catch {
        // fallback
        prompt('아래 코드를 복사해 주세요:', text);
      }
    }
  };

  const statusBadge = (inv: Invitation) => {
    const expired = new Date(inv.expiresAt) < new Date();
    if (inv.isUsed) return { label: '사용됨', bg: '#f2f4f6', color: '#8b95a1' };
    if (expired) return { label: '만료됨', bg: '#ffeeee', color: '#f04452' };
    return { label: '대기중', bg: '#f0faf6', color: '#03b26c' };
  };

  const assignedTenant = (inv: Invitation) => {
    if (!inv.tenantId) return null;
    return tenants.find(t => t.id === inv.tenantId);
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: '#333d4b', color: '#fff', padding: '14px 24px', borderRadius: '14px',
          fontSize: '14px', fontWeight: '500', zIndex: 10000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxWidth: '360px', textAlign: 'center',
          animation: 'slideUp 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}
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
          <select
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' as const }}
          >
            <option value="">세입자 지정 안함</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} (방: {t.room?.name || '미정'})</option>
            ))}
          </select>
        </div>

        <Button variant="primary" onClick={generate} disabled={generating}>
          {generating ? '발급 중...' : '🎫 초대코드 생성하기'}
        </Button>
      </div>

      {/* 초대코드 목록 */}
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#191f28', marginBottom: '12px' }}>
        발급된 초대코드 ({invitations.length})
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>
      ) : invitations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
          <div style={{ fontSize: '14px' }}>발급된 초대코드가 없습니다</div>
        </div>
      ) : (
        <div>
          {invitations.map(inv => {
            const badge = statusBadge(inv);
            const tenant = assignedTenant(inv);
            const isActive = !inv.isUsed && new Date(inv.expiresAt) >= new Date();

            return (
              <div key={inv.id} style={{
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
                  {tenant ? `👤 ${tenant.name} (${tenant.room?.name || '방 미정'})` : '👤 지정 안됨'}
                  {' · '}만료: {new Date(inv.expiresAt).toLocaleDateString('ko-KR')}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isActive && (
                    <Button
                      variant="secondary"
                      style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
                      onClick={() => shareCode(inv.code)}
                    >
                      📋 {isTossApp() ? '공유하기' : '코드 복사'}
                    </Button>
                  )}
                  <button
                    onClick={() => deleteInv(inv.id)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', border: 'none',
                      background: '#ffeeee', color: '#f04452', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
