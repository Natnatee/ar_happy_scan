import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        image: resolve(__dirname, 'image.html'),
        face: resolve(__dirname, 'face.html'),
        gps: resolve(__dirname, 'gps.html'),
        gyro: resolve(__dirname, 'gyro.html'),
        slot: resolve(__dirname, 'slot.html'),
      },
    },
  },
});
