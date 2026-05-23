const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro 설정: Ait 전역 방어막을 앱 메인 모듈보다 먼저 실행시킵니다.
 * 
 * Granite 프레임워크의 <Index /> 컴포넌트가 Ait 전역 객체를 참조하는데,
 * 네이티브 브릿지가 주입하기 전에 접근하면 ReferenceError가 발생합니다.
 * getModulesRunBeforeMainModule에 폴리필을 등록하여 선제 방어합니다.
 */
const config = getDefaultConfig(__dirname);

const defaultModules = config.serializer?.getModulesRunBeforeMainModule?.() || [
  require.resolve('react-native/Libraries/Core/InitializeCore'),
];

config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    path.resolve(__dirname, 'ait-polyfill.js'),
    ...defaultModules,
  ],
};

module.exports = config;
