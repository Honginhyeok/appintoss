// @apps-in-toss/web-framework
export default {
  appId: '28247',
  appName: 'check-in-host',
  brand: {
    displayName: '체크인사장님',
    icon: 'icon.png',
    primaryColor: '#000000'
  },
  webViewProps: {
    type: 'partner',
    allowsBackForwardNavigationGestures: false,
    mediaPlaybackRequiresUserAction: true,
    allowsInlineMediaPlayback: true,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false
  },
  server: {
    host: '172.20.10.6',
  },
  web: {
    host: '172.20.10.6',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'npm run build:vite'
    }
  },
  build: {
    outDir: 'dist',
  },
  outdir: 'dist',
  permissions: []
};
