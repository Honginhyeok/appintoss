// ─── API WRAPPER ──────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  
  // JWT 토큰 명시적 포함
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(url, opts);

    // ── 전역 401/403 인터셉터: 인증 관련 API가 아닌 곳에서 발생하면 강제 로그아웃 ──
    if ((res.status === 401 || res.status === 403) && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
      console.warn(`[API] 인증/권한 에러 발생: ${res.status} ${res.statusText} URL: ${url}`);
      
      let errorMsg = '권한이 없습니다.';
      try {
        const errData = await res.json();
        if (errData && errData.error) errorMsg = errData.error;
        console.error(`[API Error Response]:`, errData);
      } catch(e) {}

      // 로컬 상태 완전 정리
      currentUser = null;
      try { localStorage.removeItem('currentUser'); } catch(e) {}
      try { localStorage.removeItem('token'); } catch(e) {}

      // 로그인 화면으로 강제 이동
      if (typeof showLoginOverlay === 'function') showLoginOverlay();
      if (typeof showToast === 'function') showToast(errorMsg);

      return { error: errorMsg };
    }

    const text = await res.text();
    if (!text) return []; // 빈 응답 시 빈 배열 반환

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.warn("JSON Parse Error (무시됨):", err, text);
      return [];
    }

    // 에러 상태코드일 경우 상세 로깅
    if (!res.ok) {
        console.error(`[API Failed] ${method} ${url}: ${res.status} ${res.statusText}`, data);
    }

    // 에러 응답 객체 ({ error: "..." }) 는 그대로 반환
    if (data && typeof data === 'object' && data.error) {
      return data;
    }

    // 정상 응답: data 자체를 반환
    return data || [];
  } catch(e) {
    console.error(`[API Request Error] ${method} ${url}:`, e);
    return { error: '네트워크 오류가 발생했습니다.' };
  }
}
