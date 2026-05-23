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
exports.Rooms = Rooms;
const react_1 = require("react");
const tds_1 = require("../components/tds");
const UpgradeModal_1 = require("../components/UpgradeModal");
function Rooms() {
    const [rooms, setRooms] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isUpgradeModalOpen, setUpgradeModalOpen] = (0, react_1.useState)(false);
    const [newRoomName, setNewRoomName] = (0, react_1.useState)('');
    const fetchRooms = () => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const res = yield fetch('/api/rooms', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = yield res.json();
                setRooms(data);
            }
        }
        catch (e) {
            console.error(e);
        }
        setLoading(false);
    });
    (0, react_1.useEffect)(() => {
        fetchRooms();
    }, []);
    const handleAddRoom = () => __awaiter(this, void 0, void 0, function* () {
        if (!newRoomName.trim()) {
            alert('추가할 방 이름을 입력해주세요.');
            return;
        }
        try {
            const res = yield fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newRoomName })
            });
            if (res.status === 403) {
                const err = yield res.json();
                if (err.code === 'UPGRADE_REQUIRED') {
                    setUpgradeModalOpen(true);
                    return;
                }
            }
            if (res.ok) {
                setNewRoomName('');
                fetchRooms();
            }
            else {
                alert('방 생성에 실패했습니다.');
            }
        }
        catch (e) {
            console.error(e);
            alert('네트워크 오류가 발생했습니다.');
        }
    });
    return (<div style={{ padding: '24px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>내 방 관리</h2>
      <p style={{ color: '#4e5968', marginBottom: '24px' }}>관리하고 계신 방의 목록입니다.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="예: 101호" style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px', outline: 'none' }}/>
        <tds_1.Button variant="primary" style={{ width: 'auto', padding: '0 24px' }} onClick={handleAddRoom}>방 추가</tds_1.Button>
      </div>

      {loading ? (<div style={{ padding: '20px', textAlign: 'center', color: '#8b95a1' }}>불러오는 중...</div>) : rooms.length === 0 ? (<div style={{ padding: '40px', textAlign: 'center', color: '#8b95a1', backgroundColor: '#fff', borderRadius: '16px' }}>아직 등록된 방이 없습니다.</div>) : (<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rooms.map(r => (<li key={r.id} style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontSize: '16px', fontWeight: 'bold' }}>
               🏠 {r.name}
             </li>))}
        </ul>)}

      {/* 프리미엄 업그레이드 전면 모달 */}
      <UpgradeModal_1.UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} onSuccess={() => {
            setUpgradeModalOpen(false);
            handleAddRoom();
        }}/>
    </div>);
}
