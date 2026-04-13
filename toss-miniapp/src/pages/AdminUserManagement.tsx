import { useState, useEffect } from 'react';
import { Button } from '../components/tds';
import { AssignModal } from '../components/AssignModal';

export function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>사용자 및 임차인 관리</h2>
      <p style={{ color: '#4e5968', marginBottom: '24px' }}>시스템에 가입된 모든 사용자를 조회하고 배정할 수 있습니다.</p>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8b95a1' }}>데이터를 불러오는 중입니다...</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {users.map((u) => (
            <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{u.name} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#8b95a1' }}>({u.role})</span></div>
                <div style={{ fontSize: '13px', color: '#4e5968', marginTop: '4px' }}>{u.phone}</div>
                {u.role === 'TENANT' && (
                  <div style={{ fontSize: '12px', color: '#3182f6', marginTop: '4px', fontWeight: '600' }}>
                    배정 방: {u.assignedRoom?.name || '미배정'}
                  </div>
                )}
              </div>
              
              {u.role === 'TENANT' && (
                <div>
                  <Button variant="secondary" style={{ padding: '8px 16px', fontSize: '13px', height: 'auto', borderRadius: '8px' }} onClick={() => setSelectedTenantId(u.id)}>
                    방 배정
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {selectedTenantId && (
        <AssignModal 
          isOpen={true} 
          tenantId={selectedTenantId} 
          onClose={() => setSelectedTenantId(null)}
          onAssigned={() => { setSelectedTenantId(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}
