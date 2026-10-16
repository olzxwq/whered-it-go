import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Относительные пути: сайт работает и на localhost, и по адресу https://<логин>.github.io/whered-it-go/
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // новая версия сайта ставится сама при следующем открытии
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: "Where'd It Go",
        short_name: "Where'd It Go",
        description: 'Учёт личных расходов',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F4F6EF',
        theme_color: '#F4F6EF',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Запоминаем только файлы самого сайта; запросы к Яндекс Диску всегда идут в сеть
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
    }),
  ],
  server: {
    // Открываем сервер для других устройств в той же Wi-Fi сети (iPhone, iPad)
    host: true,
  },
  test: {
    environment: 'node',
  },
});
