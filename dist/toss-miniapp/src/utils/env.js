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
exports.isTossApp = isTossApp;
exports.getToken = getToken;
exports.setToken = setToken;
exports.clearToken = clearToken;
exports.apiFetch = apiFetch;
/**
 * 토스 앱 환경 감지 유틸리티
 */
function isTossApp() {
    if (typeof window === 'undefined')
        return false;
    return /tossapp/i.test(navigator.userAgent);
}
/**
 * 로컬 토큰 관리
 */
function getToken() {
    return localStorage.getItem('token');
}
function setToken(token) {
    localStorage.setItem('token', token);
}
function clearToken() {
    localStorage.removeItem('token');
}
/**
 * API fetch 헬퍼 (쿠키 + Bearer 토큰 이중 인증)
 */
function apiFetch(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, options = {}) {
        const token = getToken();
        const headers = Object.assign({ 'Content-Type': 'application/json' }, (options.headers || {}));
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = yield fetch(url, Object.assign(Object.assign({}, options), { credentials: 'include', headers }));
        return res;
    });
}
