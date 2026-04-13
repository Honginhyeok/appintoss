import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/env';
import { Button } from '../components/tds';

interface CheckResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  detail: string;
  ms?: number;
}

export function HealthCheck() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateCheck = (name: string, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  };

  const runAll = useCallback(async () => {
    setRunning(true);

    const initial: CheckResult[] = [
      { name: '🗄️ DB 연결 상태', status: 'pending', detail: '확인 중...' },
      { name: '🔐 인증 API (GET /api/auth/me)', status: 'pending', detail: '확인 중...' },
      { name: '🚪 방 관리 API (GET /api/rooms)', status: 'pending', detail: '확인 중...' },
      { name: '👤 세입자 API (GET /api/tenants)', status: 'pending', detail: '확인 중...' },
      { name: '📊 거래 API (GET /api/transactions)', status: 'pending', detail: '확인 중...' },
      { name: '🎫 초대코드 생성 (Mock POST)', status: 'pending', detail: '확인 중...' },
      { name: '💳 토스페이먼츠 위젯 SDK', status: 'pending', detail: '확인 중...' },
    ];
    setChecks(initial);

    // 1. DB 연결 — rooms API 응답 시간으로 간접 확인
    const t0 = performance.now();
    try {
      const res = await apiFetch('/api/rooms');
      const ms = Math.round(performance.now() - t0);
      if (res.ok) {
        updateCheck('🗄️ DB 연결 상태', { status: 'pass', detail: `정상 (응답 ${ms}ms)`, ms });
      } else {
        updateCheck('🗄️ DB 연결 상태', { status: 'fail', detail: `HTTP ${res.status}`, ms });
      }
    } catch (e: any) {
      updateCheck('🗄️ DB 연결 상태', { status: 'fail', detail: e.message });
    }

    // 2. Auth API
    const t1 = performance.now();
    try {
      const res = await apiFetch('/api/auth/me');
      const ms = Math.round(performance.now() - t1);
      if (res.ok) {
        const data = await res.json();
        updateCheck('🔐 인증 API (GET /api/auth/me)', { status: 'pass', detail: `로그인: ${data.user?.username} (${ms}ms)`, ms });
      } else {
        updateCheck('🔐 인증 API (GET /api/auth/me)', { status: 'fail', detail: `HTTP ${res.status} — 토큰 만료 또는 미로그인`, ms });
      }
    } catch (e: any) {
      updateCheck('🔐 인증 API (GET /api/auth/me)', { status: 'fail', detail: e.message });
    }

    // 3. Rooms API
    const t2 = performance.now();
    try {
      const res = await apiFetch('/api/rooms');
      const ms = Math.round(performance.now() - t2);
      const data = await res.json();
      updateCheck('🚪 방 관리 API (GET /api/rooms)', { status: res.ok ? 'pass' : 'fail', detail: res.ok ? `${data.length}개 방 조회 (${ms}ms)` : `HTTP ${res.status}`, ms });
    } catch (e: any) {
      updateCheck('🚪 방 관리 API (GET /api/rooms)', { status: 'fail', detail: e.message });
    }

    // 4. Tenants API
    const t3 = performance.now();
    try {
      const res = await apiFetch('/api/tenants');
      const ms = Math.round(performance.now() - t3);
      const data = await res.json();
      updateCheck('👤 세입자 API (GET /api/tenants)', { status: res.ok ? 'pass' : 'fail', detail: res.ok ? `${data.length}명 조회 (${ms}ms)` : `HTTP ${res.status}`, ms });
    } catch (e: any) {
      updateCheck('👤 세입자 API (GET /api/tenants)', { status: 'fail', detail: e.message });
    }

    // 5. Transactions API
    const t4 = performance.now();
    try {
      const res = await apiFetch('/api/transactions');
      const ms = Math.round(performance.now() - t4);
      const data = await res.json();
      updateCheck('📊 거래 API (GET /api/transactions)', { status: res.ok ? 'pass' : 'fail', detail: res.ok ? `${data.length}건 조회 (${ms}ms)` : `HTTP ${res.status}`, ms });
    } catch (e: any) {
      updateCheck('📊 거래 API (GET /api/transactions)', { status: 'fail', detail: e.message });
    }

    // 6. 초대코드 Mock 테스트 (실제 POST → 즉시 DELETE)
    try {
      const t5 = performance.now();
      const createRes = await apiFetch('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({ tenantId: null }),
      });
      const ms = Math.round(performance.now() - t5);
      if (createRes.ok) {
        const inv = await createRes.json();
        // 즉시 삭제 (클린업)
        await apiFetch(`/api/invitations/${inv.id}`, { method: 'DELETE' });
        updateCheck('🎫 초대코드 생성 (Mock POST)', { status: 'pass', detail: `코드 ${inv.code} 생성/삭제 성공 (${ms}ms)`, ms });
      } else {
        const data = await createRes.json();
        updateCheck('🎫 초대코드 생성 (Mock POST)', { status: 'fail', detail: data.error || `HTTP ${createRes.status}`, ms });
      }
    } catch (e: any) {
      updateCheck('🎫 초대코드 생성 (Mock POST)', { status: 'fail', detail: e.message });
    }

    // 7. 토스페이먼츠 SDK 로딩 체크
    try {
      const t6 = performance.now();
      const script = document.createElement('script');
      script.src = 'https://js.tosspayments.com/v1/payment-widget';
      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('스크립트 로딩 실패'));
        setTimeout(() => reject(new Error('타임아웃 (5초)')), 5000);
      });
      document.head.appendChild(script);
      await loadPromise;
      const ms = Math.round(performance.now() - t6);
      updateCheck('💳 토스페이먼츠 위젯 SDK', { status: 'pass', detail: `SDK 로딩 성공 (${ms}ms)`, ms });
      document.head.removeChild(script);
    } catch (e: any) {
      updateCheck('💳 토스페이먼츠 위젯 SDK', { status: 'fail', detail: e.message });
    }

    setRunning(false);
  }, []);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const allDone = checks.length > 0 && checks.every(c => c.status !== 'pending');

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: '0 0 4px' }}>🩺 시스템 자가 진단</h2>
      <p style={{ fontSize: '13px', color: '#8b95a1', marginBottom: '24px' }}>DB, API, PG 연동 상태를 자동으로 검사합니다</p>

      <Button variant="primary" onClick={runAll} disabled={running}>
        {running ? '진단 실행 중...' : '🔍 전체 진단 시작'}
      </Button>

      {allDone && (
        <div style={{
          marginTop: '20px', borderRadius: '16px', padding: '20px', textAlign: 'center',
          background: failCount === 0 ? '#f0faf6' : '#ffeeee',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>{failCount === 0 ? '✅' : '⚠️'}</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: failCount === 0 ? '#03b26c' : '#f04452' }}>
            {failCount === 0 ? '모든 시스템 정상!' : `${failCount}개 항목 오류 감지`}
          </div>
          <div style={{ fontSize: '13px', color: '#8b95a1', marginTop: '4px' }}>
            {passCount}/{checks.length} 통과
          </div>
        </div>
      )}

      {checks.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {checks.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f2f4f6' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: '12px', fontSize: '16px', flexShrink: 0,
                background: c.status === 'pass' ? '#f0faf6' : c.status === 'fail' ? '#ffeeee' : '#f2f4f6',
              }}>
                {c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⏳'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#191f28' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: c.status === 'fail' ? '#f04452' : '#8b95a1', marginTop: '2px' }}>
                  {c.detail}
                </div>
              </div>
              {c.ms !== undefined && (
                <span style={{ fontSize: '11px', color: '#b0b8c1', flexShrink: 0 }}>{c.ms}ms</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
