import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/env';

interface TenantRecord {
  id: string;
  name: string;
  phone: string;
  roomId?: string;
  room?: { name: string };
  rentAmount?: number;
  rentPaymentDay?: number;
  rentType: string;
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
}

type PaymentStatus = 'PAID' | 'UNPAID' | 'OVERDUE';

interface TenantPayment {
  tenant: TenantRecord;
  status: PaymentStatus;
  lastPaid?: string;
}

function fmt(n: number) { return n.toLocaleString('ko-KR') + '원'; }

function getPaymentStatus(tenant: TenantRecord, transactions: Transaction[]): { status: PaymentStatus; lastPaid?: string } {
  if (!tenant.rentAmount) return { status: 'PAID' };

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 이번 달 해당 세입자의 월세 수납 기록 확인
  const rentTxs = transactions.filter(t =>
    t.type === 'INCOME' && t.category === 'RENT' &&
    t.description?.includes(tenant.name) &&
    t.date.startsWith(thisMonth)
  );

  if (rentTxs.length > 0) {
    return { status: 'PAID', lastPaid: rentTxs[0].date };
  }

  // 납부일 경과 여부
  const payDay = tenant.rentPaymentDay || 25;
  if (now.getDate() > payDay) {
    return { status: 'OVERDUE' };
  }

  return { status: 'UNPAID' };
}

export function PaymentStatus() {
  const { user } = useAuth();
  const [data, setData] = useState<TenantPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, txRes] = await Promise.all([
        apiFetch('/api/tenants'),
        apiFetch('/api/transactions'),
      ]);
      if (tRes.ok && txRes.ok) {
        const tenants: TenantRecord[] = await tRes.json();
        const txs: Transaction[] = await txRes.json();

        const payments: TenantPayment[] = tenants.map(t => {
          const { status, lastPaid } = getPaymentStatus(t, txs);
          return { tenant: t, status, lastPaid };
        });

        // 연체 > 미납 > 완납 순서로 정렬
        payments.sort((a, b) => {
          const order = { OVERDUE: 0, UNPAID: 1, PAID: 2 };
          return order[a.status] - order[b.status];
        });

        setData(payments);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusConfig = {
    PAID: { label: '완납', bg: '#f0faf6', color: '#03b26c', emoji: '✅' },
    UNPAID: { label: '미납', bg: '#fff9e7', color: '#fe9800', emoji: '⏳' },
    OVERDUE: { label: '연체', bg: '#ffeeee', color: '#f04452', emoji: '🚨' },
  };

  const counts = {
    paid: data.filter(d => d.status === 'PAID').length,
    unpaid: data.filter(d => d.status === 'UNPAID').length,
    overdue: data.filter(d => d.status === 'OVERDUE').length,
  };

  const isLandlord = user?.role !== 'TENANT';

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: '0 0 4px' }}>
        {isLandlord ? '💳 납부 현황' : '💳 이번 달 납부'}
      </h2>
      <p style={{ fontSize: '13px', color: '#8b95a1', marginBottom: '20px' }}>
        {isLandlord ? `${new Date().getMonth() + 1}월 세입자 임대료 수납 현황` : '월세 납부 상태를 확인하세요'}
      </p>

      {/* 요약 뱃지 */}
      {isLandlord && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { label: '완납', count: counts.paid, bg: '#f0faf6', color: '#03b26c' },
            { label: '미납', count: counts.unpaid, bg: '#fff9e7', color: '#fe9800' },
            { label: '연체', count: counts.overdue, bg: '#ffeeee', color: '#f04452' },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, background: b.bg, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: b.color }}>{b.count}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: b.color, marginTop: '2px' }}>{b.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 리스트 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b95a1' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
          <div style={{ fontSize: '14px' }}>납부 대상이 없습니다</div>
        </div>
      ) : (
        <div>
          {data.map(({ tenant, status, lastPaid }) => {
            const cfg = statusConfig[status];
            return (
              <div key={tenant.id} style={{
                display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f2f4f6',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cfg.bg, fontSize: '18px', marginRight: '14px', flexShrink: 0,
                }}>
                  {cfg.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#191f28' }}>{tenant.name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b95a1' }}>
                    {tenant.room?.name || '미배정'}
                    {lastPaid && ` · 납부: ${new Date(lastPaid).toLocaleDateString('ko-KR')}`}
                    {tenant.rentPaymentDay && ` · 매월 ${tenant.rentPaymentDay}일`}
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#191f28', flexShrink: 0 }}>
                  {tenant.rentAmount ? fmt(tenant.rentAmount) : '-'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
