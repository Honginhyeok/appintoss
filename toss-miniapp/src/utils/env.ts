/**
 * 토스 앱 환경 감지 유틸리티
 */
export function isTossApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /tossapp/i.test(navigator.userAgent);
}

/**
 * API Base URL
 * - 개발: Vite 프록시가 /api → localhost:3000 으로 중계
 * - 프로덕션(토스 미니앱): GCP Cloud Run 직접 호출
 */
const API_BASE_URL = 'https://notification-dashboard-1042551861454.asia-northeast1.run.app';

/**
 * 로컬 토큰 관리
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    return null;
  }
}
export function setToken(token: string) {
  try {
    localStorage.setItem('token', token);
  } catch (e) {}
}
export function clearToken() {
  try {
    localStorage.removeItem('token');
  } catch (e) {}
}

/**
 * API fetch 헬퍼 (쿠키 + Bearer 토큰 이중 인증)
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    credentials: import.meta.env.DEV ? 'include' : 'same-origin',
    headers,
  });
  return res;
}

