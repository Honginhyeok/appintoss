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
exports.AdminUserManagement = AdminUserManagement;
const react_1 = require("react");
const tds_1 = require("../components/tds");
const AssignModal_1 = require("../components/AssignModal");
function AdminUserManagement() {
    const [users, setUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedTenantId, setSelectedTenantId] = (0, react_1.useState)(null);
    const fetchUsers = () => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const res = yield fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = yield res.json();
                setUsers(data);
            }
        }
        catch (e) {
            console.error(e);
        }
        setLoading(false);
    });
    (0, react_1.useEffect)(() => {
        fetchUsers();
    }, []);
    return (<div style={{ padding: '24px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>사용자 및 임차인 관리</h2>
      <p style={{ color: '#4e5968', marginBottom: '24px' }}>시스템에 가입된 모든 사용자를 조회하고 배정할 수 있습니다.</p>

      {loading ? (<div style={{ padding: '40px', textAlign: 'center', color: '#8b95a1' }}>데이터를 불러오는 중입니다...</div>) : (<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {users.map((u) => {
                var _a;
                return (<li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{u.name} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#8b95a1' }}>({u.role})</span></div>
                <div style={{ fontSize: '13px', color: '#4e5968', marginTop: '4px' }}>{u.phone}</div>
                {u.role === 'TENANT' && (<div style={{ fontSize: '12px', color: '#3182f6', marginTop: '4px', fontWeight: '600' }}>
                    배정 방: {((_a = u.assignedRoom) === null || _a === void 0 ? void 0 : _a.name) || '미배정'}
                  </div>)}
              </div>
              
              {u.role === 'TENANT' && (<div>
                  <tds_1.Button variant="secondary" style={{ padding: '8px 16px', fontSize: '13px', height: 'auto', borderRadius: '8px' }} onClick={() => setSelectedTenantId(u.id)}>
                    방 배정
                  </tds_1.Button>
                </div>)}
            </li>);
            })}
        </ul>)}

      {selectedTenantId && (<AssignModal_1.AssignModal isOpen={true} tenantId={selectedTenantId} onClose={() => setSelectedTenantId(null)} onAssigned={() => { setSelectedTenantId(null); fetchUsers(); }}/>)}
    </div>);
}
