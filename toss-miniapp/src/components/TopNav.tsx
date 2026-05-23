import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/env';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './tds';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function TopNav() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await apiFetch('/api/in-app-notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
    // 주기적으로 배지 업데이트 (10초 주기)
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.isRead) {
      try {
        await apiFetch(`/api/in-app-notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch { /* ignore */ }
    }
    
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isLoggedIn) return null;

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 9998,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid #f2f4f6'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#191f28' }}>
          체크인사장님
        </div>
        
        <button 
          onClick={() => setShowNotifications(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '24px' }}
        >
          🔔
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '-2px', right: '-4px',
              background: '#f04452', color: '#fff', fontSize: '10px',
              fontWeight: 'bold', borderRadius: '50%', padding: '2px 6px'
            }}>
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      <BottomSheet isOpen={showNotifications} onClose={() => setShowNotifications(false)} title="알림 센터">
        <div style={{ padding: '0 8px' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#8b95a1' }}>
              새로 도착한 알림이 없습니다.
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '16px', background: n.isRead ? '#ffffff' : '#f0f6ff',
                  borderRadius: '16px', marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer',
                  border: n.isRead ? '1px solid #e5e8eb' : '1px solid #cce1ff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {!n.isRead && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3182f6' }} />}
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#191f28' }}>{n.title}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#4e5968', marginBottom: '8px' }}>{n.message}</div>
                <div style={{ fontSize: '11px', color: '#8b95a1' }}>{new Date(n.createdAt).toLocaleString('ko-KR')}</div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </>
  );
}
