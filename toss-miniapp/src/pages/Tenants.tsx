import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/env';
import { Button, TextField, BottomSheet } from '../components/tds';

interface Room {
  id: string;
  name: string;
  status: string;
}

interface TenantData {
  id: string;
  name: string;
  phone: string;
  roomId?: string;
  room?: { id: string; name: string };
  rentType: string;
  rentAmount?: number;
  rentPaymentDay?: number;
  deposit?: number;
  moveInDate?: string;
  moveOutDate?: string;
}

/** 금액 포매터 */
function fmt(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

/** 전화번호 자동 하이픈 */
function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}

export function Tenants() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [rentType, setRentType] = useState('MONTHLY');
  const [rentAmount, setRentAmount] = useState('');
  const [rentPaymentDay, setRentPaymentDay] = useState('');
  const [deposit, setDeposit] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        apiFetch('/api/tenants'),
        apiFetch('/api/rooms'),
      ]);
      if (tRes.ok) setTenants(await tRes.json());
      if (rRes.ok) setRooms(await rRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditId(null); setName(''); setPhone(''); setRoomId('');
    setRentType('MONTHLY'); setRentAmount(''); setRentPaymentDay('');
    setDeposit(''); setMoveInDate('');
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (t: TenantData) => {
    setEditId(t.id);
    setName(t.name);
    setPhone(formatPhone(t.phone || ''));
    setRoomId(t.roomId || '');
    setRentType(t.rentType || 'MONTHLY');
    setRentAmount(t.rentAmount ? String(t.rentAmount) : '');
    setRentPaymentDay(t.rentPaymentDay ? String(t.rentPaymentDay) : '');
    setDeposit(t.deposit ? String(t.deposit) : '');
    setMoveInDate(t.moveInDate ? t.moveInDate.split('T')[0] : '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name) { alert('세입자 이름을 입력하세요'); return; }
    setSaving(true);
    const body: any = {
      name,
      phone: phone.replace(/[^0-9]/g, ''),
      roomId: roomId || null,
      rentType,
      rentAmount: rentAmount ? parseFloat(rentAmount) : null,
      rentPaymentDay: rentPaymentDay ? parseInt(rentPaymentDay) : null,
      deposit: deposit ? parseFloat(deposit) : null,
      moveInDate: moveInDate || null,
    };

    try {
      const url = editId ? `/api/tenants/${editId}` : '/api/tenants';
      const method = editId ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        await load();
      } else {
        const d = await res.json();
        alert(d.error || '저장 실패');
      }
    } catch { alert('네트워크 오류'); }
    setSaving(false);
  };

  const handleDelete = async (t: TenantData) => {
    if (!confirm(`"${t.name}" 세입자를 삭제하시겠습니까?`)) return;
    try {
      const res = await apiFetch(`/api/tenants/${t.id}`, { method: 'DELETE' });
      if (res.ok) await load();
      else alert('삭제 실패');
    } catch { alert('네트워크 오류'); }
  };

  const vacantRooms = rooms.filter(r => !r.status || r.status === 'VACANT');

  const rentLabel = (t: TenantData) => {
    const badge = t.rentType === 'YEARLY' ? '년세' : t.rentType === 'CUSTOM' ? '기간제' : '월세';
    const amount = t.rentAmount ? fmt(t.rentAmount) : '-';
    const payDay = t.rentPaymentDay && t.rentType !== 'YEARLY' ? ` (매월 ${t.rentPaymentDay}일)` : '';
    return `${badge} ${amount}${payDay}`;
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>👤 세입자 관리</h2>
          <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '4px' }}>
            {tenants.length}명의 세입자가 등록되어 있습니다
          </p>
        </div>
        <Button
          variant="primary"
          style={{ padding: '10px 18px', fontSize: '14px', width: 'auto', borderRadius: '12px' }}
          onClick={openAdd}
        >
          + 세입자 등록
        </Button>
      </div>

      {/* 리스트 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>
      ) : tenants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b95a1' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#4e5968' }}>등록된 세입자가 없습니다</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>상단의 [+ 세입자 등록] 버튼을 눌러 추가하세요</div>
        </div>
      ) : (
        <div>
          {tenants.map(t => (
            <div key={t.id} style={{ background: '#f9fafb', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#191f28' }}>{t.name}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px',
                      background: t.rentType === 'YEARLY' ? '#f0faf6' : t.rentType === 'CUSTOM' ? '#fff9e7' : '#e8f3ff',
                      color: t.rentType === 'YEARLY' ? '#03b26c' : t.rentType === 'CUSTOM' ? '#fe9800' : '#3182f6',
                    }}>
                      {t.rentType === 'YEARLY' ? '년세' : t.rentType === 'CUSTOM' ? '기간제' : '월세'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7684', marginBottom: '4px' }}>
                    📞 {formatPhone(t.phone || '')} · 🚪 {t.room?.name || '미배정'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#3182f6', fontWeight: '600' }}>
                    {rentLabel(t)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEdit(t)} style={{ background: '#f2f4f6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                  <button onClick={() => handleDelete(t)} style={{ background: '#ffeeee', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 BottomSheet */}
      <BottomSheet isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editId ? '세입자 정보 수정' : '세입자 등록'}>
        <TextField label="이름 *" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
        <TextField label="연락처" type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13} />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>배정 방</label>
          <select
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', outline: 'none', boxSizing: 'border-box' as const }}
          >
            <option value="">방 선택 (미배정)</option>
            {(editId ? rooms : vacantRooms).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>임대 유형</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['MONTHLY', '월세'], ['YEARLY', '년세'], ['CUSTOM', '기간제']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRentType(val)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600', transition: 'all 0.15s',
                  background: rentType === val ? '#3182f6' : '#f2f4f6',
                  color: rentType === val ? '#fff' : '#4e5968',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <TextField label="임대료 (원)" type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="500000" />

        {rentType === 'MONTHLY' && (
          <TextField label="납부일 (매월 N일)" type="number" value={rentPaymentDay} onChange={e => setRentPaymentDay(e.target.value)} placeholder="15" />
        )}

        <TextField label="보증금 (원)" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="3000000" />
        <TextField label="입주일" type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} />

        <div style={{ marginTop: '8px' }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정 완료' : '세입자 등록하기'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
