import './polyfill';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { TDSProvider } from './components/tds';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Payment } from './pages/Payment';
import { Settings } from './pages/Settings';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { Rooms } from './pages/Rooms';
import { Tenants } from './pages/Tenants';
import { InviteTenant } from './pages/InviteTenant';
import { TransactionHistory } from './pages/TransactionHistory';
import { PaymentStatus } from './pages/PaymentStatus';
import { HealthCheck } from './pages/HealthCheck';
import { TopNav } from './components/TopNav';
import { FloatingLogger } from './components/FloatingLogger';

/* ─── Private Route ─── */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f2f4f6', borderTopColor: '#3182f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <span style={{ color: '#8b95a1', fontSize: '14px' }}>인증 확인 중...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ─── 하단 네비게이션 바 (Bottom Navigation) ─── */
function BottomNav() {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isLoggedIn || location.pathname === '/login') return null;

  const isLandlord = user?.role !== 'TENANT';

  const items = isLandlord
    ? [
        { path: '/dashboard', label: '홈', icon: '🏠', iconActive: '🏠' },
        { path: '/rooms', label: '방', icon: '🚪', iconActive: '🚪' },
        { path: '/tenants', label: '세입자', icon: '👤', iconActive: '👤' },
        { path: '/board', label: '게시판', icon: '📋', iconActive: '📋' },
        { path: '/settings', label: '설정', icon: '⚙️', iconActive: '⚙️' },
      ]
    : [
        { path: '/payment', label: '납부', icon: '💳', iconActive: '💳' },
        { path: '/board', label: '게시판', icon: '📋', iconActive: '📋' },
        { path: '/settings', label: '설정', icon: '⚙️', iconActive: '⚙️' },
      ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      background: '#ffffff', borderTop: '1px solid #f2f4f6',
      padding: '6px 0 env(safe-area-inset-bottom, 8px)',
      zIndex: 9999,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
    }}>
      {items.map(item => {
        const active = location.pathname === item.path ||
          (item.path === '/dashboard' && location.pathname === '/');
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 12px', minWidth: '48px',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: '22px',
              filter: active ? 'none' : 'grayscale(60%)',
              opacity: active ? 1 : 0.6,
              transition: 'all 0.2s',
            }}>
              {active ? item.iconActive : item.icon}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: active ? '700' : '500',
              color: active ? '#3182f6' : '#8b95a1',
              transition: 'color 0.15s',
            }}>
              {item.label}
            </span>
            {active && (
              <div style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: '#3182f6', marginTop: '1px',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

import { Board } from './pages/Board';
import { WebGuide } from './pages/WebGuide';
import { IAP } from '@apps-in-toss/web-framework';
import { useEffect } from 'react';
import { apiFetch } from './utils/env';

/* ─── App Content ─── */
function AppContent() {
  const { user } = useAuth();
  const defaultPath = user?.role === 'TENANT' ? '/payment' : '/dashboard';

  useEffect(() => {
    // [SDK 2.6.2 권장] 구매 복구 로직 연동
    // 앱 초기화 시점에 미지급된 결제 건이 있는지 확인하고 지급 처리
    async function recoverPendingOrders() {
      try {
        const result = await IAP.getPendingOrders();
        if (!result?.orders?.length) return;

        for (const order of result.orders) {
          console.log('[IAP Recovery] 복구할 주문 발견:', order.orderId);
          
          // 백엔드에 구독 혜택 지급 요청 (UpgradeModal의 processProductGrant와 동일한 API)
          const res = await apiFetch('/api/users/upgrade', {
            method: 'POST',
            body: JSON.stringify({ 
              orderId: order.orderId, 
              subscriptionId: (order as any).subscriptionId || order.orderId // subscriptionId가 없으면 orderId 임시사용 (토스 스펙 확인 필요)
            }),
          });
          const data = await res.json();
          
          if (data.success) {
            console.log('[IAP Recovery] 백엔드 지급 처리 완료, completeProductGrant 호출');
            await IAP.completeProductGrant({ params: { orderId: order.orderId } });
          }
        }
      } catch (err) {
        console.error('[IAP Recovery] 구매 복구 중 오류:', err);
      }
    }
    
    // 유저가 로그인 된 상태(혹은 토스 미니앱 환경)일 때만 실행
    if (user) {
      recoverPendingOrders();
    }
  }, [user]);

  return (
    <div style={{
      maxWidth: '480px', margin: '0 auto', minHeight: '100vh',
      background: '#ffffff', boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      position: 'relative',
    }}>
      <TopNav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Navigate to={defaultPath} replace /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminUserManagement /></PrivateRoute>} />
        <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
        <Route path="/tenants" element={<PrivateRoute><Tenants /></PrivateRoute>} />
        <Route path="/invitations" element={<PrivateRoute><InviteTenant /></PrivateRoute>} />
        <Route path="/board" element={<PrivateRoute><Board /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><TransactionHistory /></PrivateRoute>} />
        <Route path="/payment-status" element={<PrivateRoute><PaymentStatus /></PrivateRoute>} />
        <Route path="/health" element={<PrivateRoute><HealthCheck /></PrivateRoute>} />
        <Route path="/web-guide" element={<PrivateRoute><WebGuide /></PrivateRoute>} />
      </Routes>
      <BottomNav />
    </div>
  );
}

/* ─── Root ─── */
function App() {
  return (
    <>
      <FloatingLogger />
      <ErrorBoundary>
        <TDSProvider>
          <AuthProvider>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </AuthProvider>
        </TDSProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;
