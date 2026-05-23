// --- [React Native (Metro) & Web 공통 전역 Ait 방어막] ---
// 이 파일은 최상단 진입점에서 가장 먼저 import 되어야 합니다.
// (import 순서 호이스팅 때문에 다른 모듈이 로드되기 전에 먼저 실행되게 보장해야 함)

if (typeof globalThis !== 'undefined' && !(globalThis as any).Ait) {
  (globalThis as any).Ait = {
    call: (method: string, params: any) => {
      console.warn(`[Mock Ait] Native method called: ${method}`, params);
      if (method === 'appLogin') return JSON.stringify({ authorizationCode: 'mock_auth_code_local_test' });
      return null;
    },
    version: '1.0.0'
  };
}

if (typeof window !== 'undefined' && !(window as any).Ait) {
  (window as any).Ait = (globalThis as any).Ait;
}
