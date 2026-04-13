import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 토스 샌드박스 앱 외부 접속 허용
    port: 3000,
    proxy: {
        // 백엔드 API 프록시 (포트 5000으로 가정)
        '/api': 'http://localhost:5000'
    }
  }
})
