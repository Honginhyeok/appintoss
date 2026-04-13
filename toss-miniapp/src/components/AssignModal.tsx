import { useState, useEffect } from 'react';
import { Button, BottomSheet, Select } from './tds';

export function AssignModal({ isOpen, tenantId, onClose, onAssigned }: { isOpen: boolean, tenantId: string, onClose: () => void, onAssigned: () => void }) {
  const [landlords, setLandlords] = useState<{label: string, value: string}[]>([]);
  const [selectedLandlord, setSelectedLandlord] = useState('');
  
  const [rooms, setRooms] = useState<{label: string, value: string}[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');

  const [saving, setSaving] = useState(false);

  // 임대인 목록 불러오기 (임시: 사용자 목록 중 role=LANDLORD 필터링)
  useEffect(() => {
    if (!isOpen) return;
    const fetchLandlords = async () => {
      try {
        const res = await fetch('/api/users?role=LANDLORD', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
          const data = await res.json();
          // API가 ?role=LANDLORD 를 지원한다고 가정하거나 필터링 처리
          const ll = data.filter((u: any) => u.role === 'LANDLORD').map((u: any) => ({ label: `${u.name} (${u.phone})`, value: u.id }));
          setLandlords(ll);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLandlords();
  }, [isOpen]);

  // 특정 임대인 선택 시 방 목록 불러오기
  useEffect(() => {
    if (!selectedLandlord) {
      setRooms([]);
      setSelectedRoom('');
      return;
    }
    const fetchRooms = async () => {
      try {
        const res = await fetch(`/api/admin/rooms/${selectedLandlord}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
          const data = await res.json();
          setRooms(data.map((r: any) => ({ label: r.name, value: r.id })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRooms();
  }, [selectedLandlord]);

  const handleAssign = async () => {
    if (!selectedLandlord || !selectedRoom) {
      alert('임대인과 방을 모두 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${tenantId}/assign`, {
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
      } else {
        const err = await res.json();
        alert(`배정 실패: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="방 배정하기">
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4e5968' }}>임대인 선택</p>
        <Select 
          value={selectedLandlord} 
          onChange={setSelectedLandlord} 
          options={landlords} 
          placeholder="임대인을 선택하세요"
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4e5968' }}>방 선택</p>
        <Select 
          value={selectedRoom} 
          onChange={setSelectedRoom} 
          options={rooms} 
          placeholder={selectedLandlord ? '방을 선택하세요' : '임대인을 먼저 선택하세요'}
        />
      </div>

      <Button variant="primary" onClick={handleAssign} disabled={saving}>
        {saving ? '배정 중...' : '배정 완료'}
      </Button>
    </BottomSheet>
  );
}
