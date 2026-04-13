import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TDSProvider } from './components/tds';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Payment } from './pages/Payment';
import { Settings } from './pages/Settings';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { Rooms } from './pages/Rooms';
import { Tenants } from './pages/Tenants';
import { InviteTenant } from './pages/InviteTenant';

/** 인증되지 않았으면 /login 으로 리다이렉트 */
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

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** 네비게이션 바 (로그인 후에만 보임) */
function AppNavbar() {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  if (!isLoggedIn || location.pathname === '/login') return null;

  const isLandlord = user?.role !== 'TENANT';

  const navItems = [
    ...(isLandlord ? [
      { path: '/rooms', label: '방', icon: '🚪' },
      { path: '/tenants', label: '세입자', icon: '👤' },
      { path: '/invitations', label: '초대', icon: '🎫' },
    ] : []),
    { path: '/payment', label: '납부', icon: '💳' },
    { path: '/settings', label: '설정', icon: '⚙️' },
  ];

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      borderBottom: '1px solid #f2f4f6', padding: '0', background: '#fff',
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <a
            key={item.path}
            href={item.path}
            style={{
              textDecoration: 'none',
              padding: '14px 8px',
              fontSize: '13px',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#3182f6' : '#8b95a1',
              borderBottom: isActive ? '2px solid #3182f6' : '2px solid transparent',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function AppContent() {
  const { user } = useAuth();
  const defaultPath = user?.role === 'TENANT' ? '/payment' : '/rooms';

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#ffffff', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
      <AppNavbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Navigate to={defaultPath} replace /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminUserManagement /></PrivateRoute>} />
        <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
        <Route path="/tenants" element={<PrivateRoute><Tenants /></PrivateRoute>} />
        <Route path="/invitations" element={<PrivateRoute><InviteTenant /></PrivateRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <TDSProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TDSProvider>
  );
}

export default App;
