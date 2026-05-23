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
exports.Tenants = Tenants;
const react_1 = require("react");
const env_1 = require("../utils/env");
const tds_1 = require("../components/tds");
/** 금액 포매터 */
function fmt(n) {
    return n.toLocaleString('ko-KR') + '원';
}
/** 전화번호 자동 하이픈 */
function formatPhone(v) {
    const d = v.replace(/[^0-9]/g, '').slice(0, 11);
    if (d.length <= 3)
        return d;
    if (d.length <= 7)
        return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
function Tenants() {
    const [tenants, setTenants] = (0, react_1.useState)([]);
    const [rooms, setRooms] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    // Form fields
    const [name, setName] = (0, react_1.useState)('');
    const [phone, setPhone] = (0, react_1.useState)('');
    const [roomId, setRoomId] = (0, react_1.useState)('');
    const [rentType, setRentType] = (0, react_1.useState)('MONTHLY');
    const [rentAmount, setRentAmount] = (0, react_1.useState)('');
    const [rentPaymentDay, setRentPaymentDay] = (0, react_1.useState)('');
    const [deposit, setDeposit] = (0, react_1.useState)('');
    const [moveInDate, setMoveInDate] = (0, react_1.useState)('');
    const [saving, setSaving] = (0, react_1.useState)(false);
    const load = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const [tRes, rRes] = yield Promise.all([
                (0, env_1.apiFetch)('/api/tenants'),
                (0, env_1.apiFetch)('/api/rooms'),
            ]);
            if (tRes.ok)
                setTenants(yield tRes.json());
            if (rRes.ok)
                setRooms(yield rRes.json());
        }
        catch ( /* ignore */_a) { /* ignore */ }
        setLoading(false);
    }), []);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    const resetForm = () => {
        setEditId(null);
        setName('');
        setPhone('');
        setRoomId('');
        setRentType('MONTHLY');
        setRentAmount('');
        setRentPaymentDay('');
        setDeposit('');
        setMoveInDate('');
    };
    const openAdd = () => { resetForm(); setShowForm(true); };
    const openEdit = (t) => {
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
    const handleSave = () => __awaiter(this, void 0, void 0, function* () {
        if (!name) {
            alert('세입자 이름을 입력하세요');
            return;
        }
        setSaving(true);
        const body = {
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
            const res = yield (0, env_1.apiFetch)(url, { method, body: JSON.stringify(body) });
            if (res.ok) {
                setShowForm(false);
                resetForm();
                yield load();
            }
            else {
                const d = yield res.json();
                alert(d.error || '저장 실패');
            }
        }
        catch (_a) {
            alert('네트워크 오류');
        }
        setSaving(false);
    });
    const handleDelete = (t) => __awaiter(this, void 0, void 0, function* () {
        if (!confirm(`"${t.name}" 세입자를 삭제하시겠습니까?`))
            return;
        try {
            const res = yield (0, env_1.apiFetch)(`/api/tenants/${t.id}`, { method: 'DELETE' });
            if (res.ok)
                yield load();
            else
                alert('삭제 실패');
        }
        catch (_a) {
            alert('네트워크 오류');
        }
    });
    const vacantRooms = rooms.filter(r => !r.status || r.status === 'VACANT');
    const rentLabel = (t) => {
        const badge = t.rentType === 'YEARLY' ? '년세' : t.rentType === 'CUSTOM' ? '기간제' : '월세';
        const amount = t.rentAmount ? fmt(t.rentAmount) : '-';
        const payDay = t.rentPaymentDay && t.rentType !== 'YEARLY' ? ` (매월 ${t.rentPaymentDay}일)` : '';
        return `${badge} ${amount}${payDay}`;
    };
    return (<div style={{ padding: '24px', minHeight: '100vh', background: '#fff' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#191f28', margin: 0 }}>👤 세입자 관리</h2>
          <p style={{ fontSize: '13px', color: '#8b95a1', marginTop: '4px' }}>
            {tenants.length}명의 세입자가 등록되어 있습니다
          </p>
        </div>
        <tds_1.Button variant="primary" style={{ padding: '10px 18px', fontSize: '14px', width: 'auto', borderRadius: '12px' }} onClick={openAdd}>
          + 세입자 등록
        </tds_1.Button>
      </div>

      {/* 리스트 */}
      {loading ? (<div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>) : tenants.length === 0 ? (<div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b95a1' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#4e5968' }}>등록된 세입자가 없습니다</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>상단의 [+ 세입자 등록] 버튼을 눌러 추가하세요</div>
        </div>) : (<div>
          {tenants.map(t => {
                var _a;
                return (<div key={t.id} style={{ background: '#f9fafb', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
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
                    📞 {formatPhone(t.phone || '')} · 🚪 {((_a = t.room) === null || _a === void 0 ? void 0 : _a.name) || '미배정'}
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
            </div>);
            })}
        </div>)}

      {/* 등록/수정 BottomSheet */}
      <tds_1.BottomSheet isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editId ? '세입자 정보 수정' : '세입자 등록'}>
        <tds_1.TextField label="이름 *" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"/>
        <tds_1.TextField label="연락처" type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13}/>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>배정 방</label>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}>
            <option value="">방 선택 (미배정)</option>
            {(editId ? rooms : vacantRooms).map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>임대 유형</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['MONTHLY', '월세'], ['YEARLY', '년세'], ['CUSTOM', '기간제']].map(([val, label]) => (<button key={val} onClick={() => setRentType(val)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', transition: 'all 0.15s',
                background: rentType === val ? '#3182f6' : '#f2f4f6',
                color: rentType === val ? '#fff' : '#4e5968',
            }}>
                {label}
              </button>))}
          </div>
        </div>

        <tds_1.TextField label="임대료 (원)" type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="500000"/>

        {rentType === 'MONTHLY' && (<tds_1.TextField label="납부일 (매월 N일)" type="number" value={rentPaymentDay} onChange={e => setRentPaymentDay(e.target.value)} placeholder="15"/>)}

        <tds_1.TextField label="보증금 (원)" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="3000000"/>
        <tds_1.TextField label="입주일" type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)}/>

        <div style={{ marginTop: '8px' }}>
          <tds_1.Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : editId ? '수정 완료' : '세입자 등록하기'}
          </tds_1.Button>
        </div>
      </tds_1.BottomSheet>
    </div>);
}
