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
exports.AssignModal = AssignModal;
const react_1 = require("react");
const tds_1 = require("./tds");
function AssignModal({ isOpen, tenantId, onClose, onAssigned }) {
    const [landlords, setLandlords] = (0, react_1.useState)([]);
    const [selectedLandlord, setSelectedLandlord] = (0, react_1.useState)('');
    const [rooms, setRooms] = (0, react_1.useState)([]);
    const [selectedRoom, setSelectedRoom] = (0, react_1.useState)('');
    const [saving, setSaving] = (0, react_1.useState)(false);
    // 임대인 목록 불러오기 (임시: 사용자 목록 중 role=LANDLORD 필터링)
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        const fetchLandlords = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch('/api/users?role=LANDLORD', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                if (res.ok) {
                    const data = yield res.json();
                    // API가 ?role=LANDLORD 를 지원한다고 가정하거나 필터링 처리
                    const ll = data.filter((u) => u.role === 'LANDLORD').map((u) => ({ label: `${u.name} (${u.phone})`, value: u.id }));
                    setLandlords(ll);
                }
            }
            catch (e) {
                console.error(e);
            }
        });
        fetchLandlords();
    }, [isOpen]);
    // 특정 임대인 선택 시 방 목록 불러오기
    (0, react_1.useEffect)(() => {
        if (!selectedLandlord) {
            setRooms([]);
            setSelectedRoom('');
            return;
        }
        const fetchRooms = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch(`/api/admin/rooms/${selectedLandlord}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                if (res.ok) {
                    const data = yield res.json();
                    setRooms(data.map((r) => ({ label: r.name, value: r.id })));
                }
            }
            catch (e) {
                console.error(e);
            }
        });
        fetchRooms();
    }, [selectedLandlord]);
    const handleAssign = () => __awaiter(this, void 0, void 0, function* () {
        if (!selectedLandlord || !selectedRoom) {
            alert('임대인과 방을 모두 선택해주세요.');
            return;
        }
        setSaving(true);
        try {
            const res = yield fetch(`/api/users/${tenantId}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ landlordId: selectedLandlord, roomId: selectedRoom })
            });
            if (res.ok) {
                alert('배정이 완료되었습니다.');
                onAssigned();
            }
            else {
                const err = yield res.json();
                alert(`배정 실패: ${err.error}`);
            }
        }
        catch (e) {
            console.error(e);
            alert('서버 오류가 발생했습니다.');
        }
        setSaving(false);
    });
    return (<tds_1.BottomSheet isOpen={isOpen} onClose={onClose} title="방 배정하기">
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4e5968' }}>임대인 선택</p>
        <tds_1.Select value={selectedLandlord} onChange={setSelectedLandlord} options={landlords} placeholder="임대인을 선택하세요"/>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4e5968' }}>방 선택</p>
        <tds_1.Select value={selectedRoom} onChange={setSelectedRoom} options={rooms} placeholder={selectedLandlord ? '방을 선택하세요' : '임대인을 먼저 선택하세요'}/>
      </div>

      <tds_1.Button variant="primary" onClick={handleAssign} disabled={saving}>
        {saving ? '배정 중...' : '배정 완료'}
      </tds_1.Button>
    </tds_1.BottomSheet>);
}
