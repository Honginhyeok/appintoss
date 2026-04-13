import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/env';
import { Button, TextField, BottomSheet } from '../components/tds';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description?: string;
  date: string;
  roomId?: string;
  room?: { name: string };
}

const CATEGORIES: Record<string, string> = {
  RENT: '월세', DEPOSIT: '보증금', MAINTENANCE: '수리비',
  UTILITY: '공과금', TAX: '세금', CLEANING: '청소비', OTHER: '기타',
};

function fmt(n: number) { return n.toLocaleString('ko-KR') + '원'; }

export function TransactionHistory() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);

  // Form
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [category, setCategory] = useState('RENT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        apiFetch('/api/transactions'),
        apiFetch('/api/rooms'),
      ]);
      if (tRes.ok) setTxs(await tRes.json());
      if (rRes.ok) setRooms(await rRes.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditId(null); setType('INCOME'); setCategory('RENT');
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
    setRoomId('');
  };

  const openEdit = (t: Transaction) => {
    setEditId(t.id); setType(t.type); setCategory(t.category);
    setAmount(String(t.amount)); setDescription(t.description || '');
    setDate(t.date.split('T')[0]); setRoomId(t.roomId || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!amount) { alert('금액을 입력하세요'); return; }
    setSaving(true);
    const body = { type, category, amount: parseFloat(amount), description, date, roomId: roomId || null };
    try {
      const url = editId ? `/api/transactions/${editId}` : '/api/transactions';
      const method = editId ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) { setShowForm(false); resetForm(); await load(); }
      else { const d = await res.json(); alert(d.error || '저장 실패'); }
    } catch { alert('네트워크 오류'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 거래 내역을 삭제하시겠습니까?')) return;
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    await load();
  };

  const filtered = filter === 'ALL' ? txs : txs.filter(t => t.type === filter);

  // 요약 계산
  const totalIncome = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: '#f0faf6', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#03b26c', fontWeight: '600', marginBottom: '4px' }}>수입</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#03b26c' }}>+{fmt(totalIncome)}</div>
        </div>
        <div style={{ flex: 1, background: '#ffeeee', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#f04452', fontWeight: '600', marginBottom: '4px' }}>지출</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#f04452' }}>-{fmt(totalExpense)}</div>
        </div>
      </div>

      {/* 헤더 + 필터 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#191f28', margin: 0 }}>📊 거래 내역</h2>
        <Button variant="primary" style={{ padding: '8px 14px', fontSize: '13px', width: 'auto', borderRadius: '10px' }} onClick={() => { resetForm(); setShowForm(true); }}>
          + 기록
        </Button>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
              background: filter === f ? '#191f28' : '#f2f4f6',
              color: filter === f ? '#fff' : '#6b7684',
            }}
          >
            {f === 'ALL' ? '전체' : f === 'INCOME' ? '수입' : '지출'}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b95a1' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '14px' }}>거래 내역이 없습니다</div>
        </div>
      ) : (
        <div>
          {filtered.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f2f4f6' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: t.type === 'INCOME' ? '#f0faf6' : '#ffeeee', fontSize: '18px', marginRight: '14px', flexShrink: 0,
              }}>
                {t.type === 'INCOME' ? '💰' : '💸'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#191f28' }}>{CATEGORIES[t.category] || t.category}</span>
                  <span style={{
                    fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '4px',
                    background: t.type === 'INCOME' ? '#f0faf6' : '#ffeeee',
                    color: t.type === 'INCOME' ? '#03b26c' : '#f04452',
                  }}>
                    {t.type === 'INCOME' ? '수입' : '지출'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#8b95a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.room?.name || '공통'} · {t.description || '-'} · {new Date(t.date).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: t.type === 'INCOME' ? '#03b26c' : '#f04452' }}>
                  {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                  <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>✏️</button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 BottomSheet */}
      <BottomSheet isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editId ? '거래 내역 수정' : '거래 기록 추가'}>
        {/* 수입/지출 토글 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['INCOME', 'EXPENSE'] as const).map(v => (
            <button key={v} onClick={() => setType(v)} style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '14px',
              background: type === v ? (v === 'INCOME' ? '#03b26c' : '#f04452') : '#f2f4f6',
              color: type === v ? '#fff' : '#6b7684',
            }}>
              {v === 'INCOME' ? '💰 수입' : '💸 지출'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>카테고리</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', outline: 'none', boxSizing: 'border-box' as const }}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <TextField label="금액 (원) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500000" />
        <TextField label="날짜" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <TextField label="설명 (메모)" value={description} onChange={e => setDescription(e.target.value)} placeholder="예: 홍길동 월세 수납" />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>관련 방</label>
          <select value={roomId} onChange={e => setRoomId(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', outline: 'none', boxSizing: 'border-box' as const }}>
            <option value="">공통 (방 없음)</option>
            {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : editId ? '수정 완료' : '거래 기록하기'}
        </Button>
      </BottomSheet>
    </div>
  );
}
