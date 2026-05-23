"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const tds_1 = require("./components/tds");
const AuthContext_1 = require("./context/AuthContext");
const ErrorBoundary_1 = require("./components/ErrorBoundary");
const Login_1 = require("./pages/Login");
const Dashboard_1 = require("./pages/Dashboard");
const Payment_1 = require("./pages/Payment");
const Settings_1 = require("./pages/Settings");
const AdminUserManagement_1 = require("./pages/AdminUserManagement");
const Rooms_1 = require("./pages/Rooms");
const Tenants_1 = require("./pages/Tenants");
const InviteTenant_1 = require("./pages/InviteTenant");
const TransactionHistory_1 = require("./pages/TransactionHistory");
const PaymentStatus_1 = require("./pages/PaymentStatus");
const HealthCheck_1 = require("./pages/HealthCheck");
/* ─── Private Route ─── */
function PrivateRoute({ children }) {
    const { isLoggedIn, isLoading } = (0, AuthContext_1.useAuth)();
    if (isLoading) {
        return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f2f4f6', borderTopColor: '#3182f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
          <span style={{ color: '#8b95a1', fontSize: '14px' }}>인증 확인 중...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>);
    }
    if (!isLoggedIn)
        return <react_router_dom_1.Navigate to="/login" replace/>;
    return <>{children}</>;
}
/* ─── 하단 네비게이션 바 (Bottom Navigation) ─── */
function BottomNav() {
    const { isLoggedIn, user } = (0, AuthContext_1.useAuth)();
    const location = (0, react_router_dom_1.useLocation)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    if (!isLoggedIn || location.pathname === '/login')
        return null;
    const isLandlord = (user === null || user === void 0 ? void 0 : user.role) !== 'TENANT';
    const items = isLandlord
        ? [
            { path: '/dashboard', label: '홈', icon: '🏠', iconActive: '🏠' },
            { path: '/rooms', label: '방', icon: '🚪', iconActive: '🚪' },
            { path: '/tenants', label: '세입자', icon: '👤', iconActive: '👤' },
            { path: '/transactions', label: '거래', icon: '📊', iconActive: '📊' },
            { path: '/settings', label: '설정', icon: '⚙️', iconActive: '⚙️' },
        ]
        : [
            { path: '/payment', label: '납부', icon: '💳', iconActive: '💳' },
            { path: '/settings', label: '설정', icon: '⚙️', iconActive: '⚙️' },
        ];
    return (<nav style={{
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
            return (<button key={item.path} onClick={() => navigate(item.path)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 12px', minWidth: '48px',
                    transition: 'all 0.15s',
                }}>
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
            {active && (<div style={{
                        width: '4px', height: '4px', borderRadius: '50%',
                        background: '#3182f6', marginTop: '1px',
                    }}/>)}
          </button>);
        })}
    </nav>);
}
/* ─── App Content ─── */
function AppContent() {
    const { user } = (0, AuthContext_1.useAuth)();
    const defaultPath = (user === null || user === void 0 ? void 0 : user.role) === 'TENANT' ? '/payment' : '/dashboard';
    return (<div style={{
            maxWidth: '480px', margin: '0 auto', minHeight: '100vh',
            background: '#ffffff', boxShadow: '0 0 20px rgba(0,0,0,0.05)',
            position: 'relative',
        }}>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path="/login" element={<Login_1.Login />}/>
        <react_router_dom_1.Route path="/" element={<PrivateRoute><react_router_dom_1.Navigate to={defaultPath} replace/></PrivateRoute>}/>
        <react_router_dom_1.Route path="/dashboard" element={<PrivateRoute><Dashboard_1.Dashboard /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/payment" element={<PrivateRoute><Payment_1.Payment /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/settings" element={<PrivateRoute><Settings_1.Settings /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/admin" element={<PrivateRoute><AdminUserManagement_1.AdminUserManagement /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/rooms" element={<PrivateRoute><Rooms_1.Rooms /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/tenants" element={<PrivateRoute><Tenants_1.Tenants /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/invitations" element={<PrivateRoute><InviteTenant_1.InviteTenant /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/transactions" element={<PrivateRoute><TransactionHistory_1.TransactionHistory /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/payment-status" element={<PrivateRoute><PaymentStatus_1.PaymentStatus /></PrivateRoute>}/>
        <react_router_dom_1.Route path="/health" element={<PrivateRoute><HealthCheck_1.HealthCheck /></PrivateRoute>}/>
      </react_router_dom_1.Routes>
      <BottomNav />
    </div>);
}
/* ─── Root ─── */
function App() {
    return (<ErrorBoundary_1.ErrorBoundary>
      <tds_1.TDSProvider>
        <AuthContext_1.AuthProvider>
          <react_router_dom_1.BrowserRouter>
            <AppContent />
          </react_router_dom_1.BrowserRouter>
        </AuthContext_1.AuthProvider>
      </tds_1.TDSProvider>
    </ErrorBoundary_1.ErrorBoundary>);
}
exports.default = App;
