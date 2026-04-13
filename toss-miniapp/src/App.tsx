import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TDSProvider } from './components/tds';
import { Payment } from './pages/Payment';
import { Settings } from './pages/Settings';
import { AdminUserManagement } from './pages/AdminUserManagement';

function App() {
  return (
    <TDSProvider>
      <BrowserRouter>
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#ffffff', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
          <header style={{ padding: '16px 24px', borderBottom: '1px solid #f2f4f6', display: 'flex', gap: '16px', fontWeight: 'bold', fontSize: '15px' }}>
            <a href="/payment" style={{ textDecoration: 'none', color: '#191F28' }}>납부하기</a>
            <a href="/settings" style={{ textDecoration: 'none', color: '#191F28' }}>설정</a>
            <a href="/admin" style={{ textDecoration: 'none', color: '#191F28' }}>관리자</a>
          </header>

          <Routes>
            <Route path="/" element={<Navigate to="/payment" />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminUserManagement />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TDSProvider>
  );
}

export default App;
