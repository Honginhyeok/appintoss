export default {
  appId: 'hostel-managing-app',
  appName: '체크인사장님',
  // 미니앱 스펙
  server: {
    host: '0.0.0.0', // 빌드/서버 개방
  },
  // 빌드 Output 명세: 토스는 .ait 번들이거나 zip을 요구함
  build: {
    outDir: 'dist',
    format: 'ait',
  }
};
