/**
 * 토스 앱 환경 감지 유틸리티
 */
export function isTossApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /tossapp/i.test(navigator.userAgent);
}

/**
 * 로컬 토큰 관리
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}
export function setToken(token: string) {
  localStorage.setItem('token', token);
}
export function clearToken() {
  localStorage.removeItem('token');
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

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
  return res;
}
