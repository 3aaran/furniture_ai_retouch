import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 本地开发时前端统一请求 /api，由 Vite 转发到后端服务。
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // 本地存储图片仍通过后端 /files 暴露；线上可由 Nginx 或对象存储域名承接。
      '/files': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
