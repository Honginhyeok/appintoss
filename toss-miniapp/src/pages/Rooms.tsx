import { useState, useEffect } from 'react';
import { Button } from '../components/tds';
import { UpgradeModal } from '../components/UpgradeModal';

export function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      alert('추가할 방 이름을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newRoomName })
      });

      if (res.status === 403) {
        const err = await res.json();
        if (err.code === 'UPGRADE_REQUIRED') {
          setUpgradeModalOpen(true);
          return;
        }
      }

      if (res.ok) {
        setNewRoomName('');
        fetchRooms();
      } else {
        alert('방 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>내 방 관리</h2>
      <p style={{ color: '#4e5968', marginBottom: '24px' }}>관리하고 계신 방의 목록입니다.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input 
          type="text" 
          value={newRoomName} 
          onChange={(e) => setNewRoomName(e.target.value)} 
          placeholder="예: 101호"
          style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px', outline: 'none' }}
        />
        <Button variant="primary" style={{ width: 'auto', padding: '0 24px' }} onClick={handleAddRoom}>방 추가</Button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8b95a1' }}>불러오는 중...</div>
      ) : rooms.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8b95a1', backgroundColor: '#fff', borderRadius: '16px' }}>아직 등록된 방이 없습니다.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rooms.map(r => (
             <li key={r.id} style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontSize: '16px', fontWeight: 'bold' }}>
               🏠 {r.name}
             </li>
          ))}
        </ul>
      )}

      {/* 프리미엄 업그레이드 전면 모달 */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)} 
        onSuccess={() => {
          setUpgradeModalOpen(false);
          handleAddRoom();
        }}
      />
    </div>
  );
}
