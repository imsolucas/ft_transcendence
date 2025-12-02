import { defineConfig } from "vite";
import path from "path"

export default defineConfig({
  appType: 'spa', // enable spa fallback
  root: '.',
  build: {
    outDir: 'dist'
  },
  
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared'),
    }
  },

  server: {
	watch: {
      usePolling: true,
      interval: 1000, // check for changes every second
    },
    port: 3000,    // 👈 set port here
    strictPort: true // 👈 optional, forces Vite to fail if 3000 is busy
  }
});
