import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

const removeCrossoriginPlugin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html.replace(/ crossorigin/g, '');
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(), 
    removeCrossoriginPlugin(),
    legacy({
      targets: ['defaults', 'not IE 11', 'iOS >= 11', 'safari >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  build: {
    target: ['es2015', 'chrome87', 'safari14']
  },
  server: {
    host: '0.0.0.0', // 토스 샌드박스 앱 외부 접속 허용
    port: 5173,
    proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          cookieDomainRewrite: '',
        }
    }
  }
})
