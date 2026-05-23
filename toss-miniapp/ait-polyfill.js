/**
 * [Ait 전역 방어막 - React Native (Metro) 런타임용]
 * 
 * Granite 프레임워크의 <Index /> 컴포넌트가 Ait 전역 객체를 참조하기 전에
 * 반드시 먼저 실행되어야 하는 폴리필입니다.
 * 
 * metro.config.js의 serializer.getModulesRunBeforeMainModule에 등록되어
 * 앱의 메인 모듈보다 먼저 실행됩니다.
 */
(function() {
  'use strict';

  if (typeof globalThis !== 'undefined' && !globalThis.Ait) {
    globalThis.Ait = {
      call: function(method, params) {
        console.warn('[Polyfill Ait] Native method called:', method, params);
        if (method === 'appLogin') {
          return JSON.stringify({ authorizationCode: 'mock_auth_code_local_test' });
        }
        return null;
      },
      version: '1.0.0'
    };
  }

  // React Native 환경에서는 global === globalThis
  if (typeof global !== 'undefined' && !global.Ait) {
    global.Ait = globalThis.Ait;
  }
})();
