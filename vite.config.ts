import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Открываем сервер для других устройств в той же Wi-Fi сети (iPhone, iPad)
    host: true,
  },
  test: {
    environment: 'node',
  },
});
