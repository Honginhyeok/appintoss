import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/env';

interface Room { id: string; name: string; status: string; monthlyRent?: number; }
interface Tenant { id: string; name: string; phone: string; roomId?: string; room?: { name: string }; rentAmount?: number; rentPaymentDay?: number; rentType: string; }
interface Transaction { id: string; type: string; category: string; amount: number; description?: string; date: string; room?: { name: string }; }

function fmt(n: number) { return n.toLocaleString('ko-KR') + '원'; }

/** 스켈레톤 라인 */
function Skeleton({ w = '100%', h = '16px', r = '8px' }: { w?: string; h?: string; r?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg, #f2f4f6 25%, #e5e8eb 50%, #f2f4f6 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
    }} />
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, tRes, txRes] = await Promise.all([
        apiFetch('/api/rooms'),
        apiFetch('/api/tenants'),
        apiFetch('/api/transactions'),
      ]);
      if (rRes.ok) setRooms(await rRes.json());
      if (tRes.ok) setTenants(await tRes.json());
      if (txRes.ok) setTxs(await txRes.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── 3대 핵심 지표 계산 ───
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ① 예상 수입 vs 실제 입금
  const expectedIncome = tenants.reduce((s, t) => {
    if (!t.rentAmount) return s;
    if (t.rentType === 'YEARLY') return s; // 년세는 월별 예상에 미포함
    return s + t.rentAmount;
  }, 0);

  const actualIncome = txs
    .filter(t => t.type === 'INCOME' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = txs
    .filter(t => t.type === 'EXPENSE' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);

  // ② 미납/연체 세입자
  const getStatus = (t: Tenant) => {
    if (!t.rentAmount) return 'PAID';
    const rentTxs = txs.filter(tx => tx.type === 'INCOME' && tx.category === 'RENT' && tx.description?.includes(t.name) && tx.date.startsWith(thisMonth));
    if (rentTxs.length > 0) return 'PAID';
    const payDay = t.rentPaymentDay || 25;
    return now.getDate() > payDay ? 'OVERDUE' : 'UNPAID';
  };

  const unpaidCount = tenants.filter(t => getStatus(t) === 'UNPAID').length;
  const overdueCount = tenants.filter(t => getStatus(t) === 'OVERDUE').length;

  // ③ 공실 현황
  const vacantRooms = rooms.filter(r => !r.status || r.status === 'VACANT');
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');

  // 최근 거래 5건
  const recentTxs = txs.slice(0, 5);

  const CATEGORIES: Record<string, string> = {
    RENT: '월세', DEPOSIT: '보증금', MAINTENANCE: '수리비',
    UTILITY: '공과금', TAX: '세금', CLEANING: '청소비', OTHER: '기타',
  };

  return (
    <div style={{ padding: '0 0 100px', minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* ─── 메인 카드: 이번 달 입금액 ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #3182f6 0%, #1b64da 100%)',
        padding: '28px 24px 24px', color: '#fff',
        borderRadius: '0 0 28px 28px',
      }}>
        <div style={{ fontSize: '14px', opacity: 0.85, marginBottom: '4px' }}>
          {now.getMonth() + 1}월 실제 입금액
        </div>
        {loading ? (
          <Skeleton w="180px" h="36px" r="8px" />
        ) : (
          <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {fmt(actualIncome)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
          <span>예상 {loading ? '...' : fmt(expectedIncome)}</span>
          <span>|</span>
          <span>지출 {loading ? '...' : fmt(totalExpense)}</span>
        </div>

        {/* 수입 달성률 바 */}
        {!loading && expectedIncome > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', opacity: 0.7 }}>
              <span>수입 달성률</span>
              <span>{Math.min(100, Math.round((actualIncome / expectedIncome) * 100))}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.2)' }}>
              <div style={{
                width: `${Math.min(100, Math.round((actualIncome / expectedIncome) * 100))}%`,
                height: '100%', borderRadius: '3px', background: '#fff',
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ─── 3대 지표 카드 ─── */}
      <div style={{ padding: '16px 20px 0', display: 'flex', gap: '10px' }}>
        {loading ? (
          <>
            <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '16px' }}><Skeleton h="20px" /><Skeleton w="60px" h="28px" /></div>
            <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '16px' }}><Skeleton h="20px" /><Skeleton w="60px" h="28px" /></div>
            <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '16px' }}><Skeleton h="20px" /><Skeleton w="60px" h="28px" /></div>
          </>
        ) : (
          <>
            {/* 미납/연체 */}
            <a href="/payment-status" style={{ flex: 1, textDecoration: 'none', background: (unpaidCount + overdueCount) > 0 ? '#ffeeee' : '#f0faf6', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: (unpaidCount + overdueCount) > 0 ? '#f04452' : '#03b26c', marginBottom: '4px' }}>
                {overdueCount > 0 ? '🚨 연체' : unpaidCount > 0 ? '⏳ 미납' : '✅ 완납'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: (unpaidCount + overdueCount) > 0 ? '#f04452' : '#03b26c' }}>
                {overdueCount + unpaidCount}명
              </div>
            </a>

            {/* 입주 현황 */}
            <a href="/rooms" style={{ flex: 1, textDecoration: 'none', background: '#e8f3ff', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#3182f6', marginBottom: '4px' }}>🏠 입주</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#3182f6' }}>
                {occupiedRooms.length}/{rooms.length}
              </div>
            </a>

            {/* 공실 */}
            <a href="/rooms" style={{ flex: 1, textDecoration: 'none', background: vacantRooms.length > 0 ? '#fff9e7' : '#f0faf6', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: vacantRooms.length > 0 ? '#fe9800' : '#03b26c', marginBottom: '4px' }}>
                🚪 공실
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: vacantRooms.length > 0 ? '#fe9800' : '#03b26c' }}>
                {vacantRooms.length}개
              </div>
            </a>
          </>
        )}
      </div>

      {/* ─── 빠른 액션 ─── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#191f28', marginBottom: '12px' }}>빠른 관리</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { href: '/tenants', icon: '👤', label: '세입자 관리', count: `${tenants.length}명` },
            { href: '/invitations', icon: '🎫', label: '초대코드', count: '발급하기' },
            { href: '/transactions', icon: '📊', label: '거래 내역', count: `${txs.length}건` },
            { href: '/health', icon: '🩺', label: '시스템 진단', count: '확인하기' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{
              display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none',
              background: '#fff', borderRadius: '14px', padding: '14px', transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: '24px' }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#191f28' }}>{a.label}</div>
                <div style={{ fontSize: '12px', color: '#8b95a1' }}>{loading ? '...' : a.count}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ─── 최근 거래 ─── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#191f28' }}>최근 거래</span>
          <a href="/transactions" style={{ fontSize: '13px', color: '#3182f6', textDecoration: 'none', fontWeight: '600' }}>전체보기 →</a>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', borderRadius: '14px', padding: '14px' }}>
                <Skeleton w="40px" h="40px" r="12px" />
                <div style={{ flex: 1 }}><Skeleton w="120px" h="14px" /><div style={{ height: '6px' }} /><Skeleton w="80px" h="12px" /></div>
                <Skeleton w="70px" h="18px" />
              </div>
            ))}
          </div>
        ) : recentTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#8b95a1', background: '#fff', borderRadius: '14px' }}>
            아직 거래 내역이 없습니다
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
            {recentTxs.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                borderBottom: i < recentTxs.length - 1 ? '1px solid #f2f4f6' : 'none',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.type === 'INCOME' ? '#f0faf6' : '#ffeeee', fontSize: '16px', marginRight: '12px', flexShrink: 0,
                }}>
                  {t.type === 'INCOME' ? '💰' : '💸'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#191f28' }}>{CATEGORIES[t.category] || t.category}</div>
                  <div style={{ fontSize: '11px', color: '#8b95a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.room?.name || '공통'} · {new Date(t.date).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: t.type === 'INCOME' ? '#03b26c' : '#f04452', flexShrink: 0 }}>
                  {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 사장님 인사말 ─── */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: '#b0b8c1' }}>
          {user?.name || user?.username}님, 오늘도 수고하셨습니다 ☕
        </div>
      </div>
    </div>
  );
}
