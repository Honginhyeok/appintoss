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
exports.useAuth = useAuth;
exports.AuthProvider = AuthProvider;
const react_1 = require("react");
const env_1 = require("../utils/env");
const AuthContext = (0, react_1.createContext)({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    login: () => __awaiter(void 0, void 0, void 0, function* () { return ({ success: false }); }),
    logout: () => __awaiter(void 0, void 0, void 0, function* () { }),
    refreshUser: () => __awaiter(void 0, void 0, void 0, function* () { }),
});
function useAuth() {
    return (0, react_1.useContext)(AuthContext);
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const refreshUser = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield (0, env_1.apiFetch)('/api/auth/me');
            if (res.ok) {
                const data = yield res.json();
                setUser(data.user);
            }
            else {
                setUser(null);
            }
        }
        catch (_a) {
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    }), []);
    (0, react_1.useEffect)(() => {
        refreshUser();
    }, [refreshUser]);
    const login = (0, react_1.useCallback)((params) => __awaiter(this, void 0, void 0, function* () {
        try {
            // --- QA 테스트 마스터키 백도어 ---
            if (params.role === 'LANDLORD' && params.username === 'admin' && params.password === 'admin1') {
                console.warn('⚠️ [개발 모드] 임시 Admin 계정으로 접속되었습니다. (백엔드 우회)');
                const mockUser = {
                    id: 'qa-mock-admin',
                    username: 'admin',
                    name: 'QA 마스터',
                    role: 'ADMIN',
                    status: 'ACTIVE'
                };
                setUser(mockUser);
                (0, env_1.setToken)('qa-mock-token');
                return { success: true };
            }
            // ---------------------------------
            const body = { role: params.role };
            if (params.role === 'LANDLORD') {
                body.username = params.username || '';
                body.password = params.password || '';
            }
            else {
                body.phone = params.phone || '';
            }
            const res = yield (0, env_1.apiFetch)('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = yield res.json();
            if (res.ok && data.success) {
                // 토큰을 localStorage에 저장 (쿠키 실패 대비)
                if (data.token) {
                    (0, env_1.setToken)(data.token);
                }
                yield refreshUser();
                return { success: true };
            }
            else {
                return { success: false, error: data.error || '로그인에 실패했습니다.' };
            }
        }
        catch (_a) {
            return { success: false, error: '네트워크 오류가 발생했습니다.' };
        }
    }), [refreshUser]);
    const logout = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, env_1.apiFetch)('/api/auth/logout', { method: 'POST' });
        }
        catch (_a) {
            // ignore
        }
        (0, env_1.clearToken)();
        setUser(null);
    }), []);
    return (<AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            isLoading,
            login,
            logout,
            refreshUser,
        }}>
      {children}
    </AuthContext.Provider>);
}
